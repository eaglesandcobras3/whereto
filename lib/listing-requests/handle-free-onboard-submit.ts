import type { SupabaseClient } from "@supabase/supabase-js";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { buildAdminAlertEmail } from "@/lib/email/business-templates";
import { listingFromAddress, sendTransactionalEmail } from "@/lib/email/send";
import { normalizeSearchTagSlug } from "@/lib/discovery-filters/search-tag-label";
import { buildFreeOnboardSearchKeywords } from "@/lib/listing-requests/free-onboard-derived";
import { sendFreeOnboardSubmitterEmail } from "@/lib/listing-requests/free-onboard-notify";
import {
  FREE_ONBOARD_SEARCH_TAGS_MAX,
  FREE_ONBOARD_TYPES,
  freeOnboardBodySchema,
  type FreeOnboardLocationPayload,
  type FreeOnboardPayload,
} from "@/lib/listing-requests/free-onboard-schema";
import { findSimilarBusinessesForListingRequest } from "@/lib/listing-requests/find-similar-businesses";
import { isListingRequestRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { getSiteUrl } from "@/lib/site-url";
import { escapeHtml } from "@/lib/string/escape-html";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/requireAdmin";

const LISTING_NOTIFICATION_TO_EMAIL_DEFAULT = "add@whereto30a.com";

function locationId() {
  return `loc-${crypto.randomUUID().slice(0, 8)}`;
}

export async function handleFreeOnboardListingRequest(
  request: NextRequest,
  json: unknown,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const parsed = freeOnboardBodySchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: issues.fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;
  if ((d._hp_company_website ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const admin = await requireAdminUser();
  let submitterName = d.submitter_name.trim();
  let submitterEmail = d.submitter_email.trim();
  let submittedByAdmin = false;
  /** undefined = do not touch image on approve; null = clear; string = set. */
  let mainImageUrl: string | null | undefined = undefined;

  if (admin) {
    submittedByAdmin = true;
    if (!submitterName) submitterName = admin.name?.trim() || "WhereTo30A Admin";
    if (!submitterEmail) {
      if (!admin.email) {
        return NextResponse.json(
          { error: "Admin account needs an email to receive listing notifications." },
          { status: 400 },
        );
      }
      submitterEmail = admin.email;
    }
    // Only persist an image change when the admin explicitly sent the field.
    if (Object.prototype.hasOwnProperty.call(d, "main_image_url")) {
      mainImageUrl = d.main_image_url ?? null;
    }
  } else {
    if (!submitterName || submitterName.length < 1) {
      return NextResponse.json(
        { error: "Name is required.", fieldErrors: { submitter_name: ["Name is required."] } },
        { status: 400 },
      );
    }
    if (!submitterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      return NextResponse.json(
        {
          error: "Email is required.",
          fieldErrors: { submitter_email: ["Enter a valid email."] },
        },
        { status: 400 },
      );
    }
  }

  if (isListingRequestRateLimited(`listing-req:${rateLimitKeyFromRequest(request)}`)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  if (d.is_storefront && d.is_service_business) {
    // Both allowed — no error.
  }

  if (!d.is_storefront && !d.is_service_business) {
    return NextResponse.json(
      {
        error:
          "Select whether you have a physical location, operate as a service business, or both.",
      },
      { status: 400 },
    );
  }

  if (d.is_storefront && d.locations.length < 1) {
    return NextResponse.json(
      { error: "Add at least one town and address for your physical location." },
      { status: 400 },
    );
  }

  const townById = new Map<string, { title: string; slug: string }>();
  if (d.locations.length > 0) {
    const townIds = [...new Set(d.locations.map((l) => l.town_id))];
    const { data: towns, error: townErr } = await supabase
      .from("towns")
      .select("id, title, slug")
      .in("id", townIds)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN);

    if (townErr || !towns || towns.length !== townIds.length) {
      return NextResponse.json({ error: "Choose valid towns for each location." }, { status: 400 });
    }

    for (const t of towns) {
      townById.set(String(t.id), {
        title: String(t.title ?? ""),
        slug: String(t.slug ?? ""),
      });
    }
  }

  const { data: category } = d.category_id
    ? await supabase
        .from("business_categories")
        .select("id, title, parent_category_id")
        .eq("id", d.category_id)
        .is("archived_at", null)
        .maybeSingle()
    : { data: null };
  if (d.category_id && !category) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (category && !category.parent_category_id) {
    return NextResponse.json(
      { error: "Choose a specific category (not a top-level group)." },
      { status: 400 },
    );
  }
  if (!d.category_id && !d.suggested_category) {
    return NextResponse.json(
      { error: "Choose a category or suggest one that is missing from the list." },
      { status: 400 },
    );
  }

  const { data: vocabTags } = await supabase.from("search_tags_vocabulary").select("tag");
  const allowed = new Set((vocabTags ?? []).map((t) => String((t as { tag: string }).tag)));
  const searchTags = d.search_tags.filter((t) => allowed.has(t));
  const searchTagKeys = new Set(searchTags.map((t) => t.toLowerCase()));
  // Promote suggestions that already exist in vocabulary; keep the rest for operator review.
  const suggestedTags: string[] = [];
  for (const raw of d.suggested_tags) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const slug = normalizeSearchTagSlug(trimmed);
    if (slug && allowed.has(slug)) {
      if (!searchTagKeys.has(slug)) {
        searchTags.push(slug);
        searchTagKeys.add(slug);
      }
      continue;
    }
    if (allowed.has(trimmed) || searchTagKeys.has(trimmed.toLowerCase())) continue;
    suggestedTags.push(trimmed);
  }
  const combinedBudget = FREE_ONBOARD_SEARCH_TAGS_MAX;
  const cappedSearchTags = searchTags.slice(0, combinedBudget);
  const remainingSlots = Math.max(0, combinedBudget - cappedSearchTags.length);
  const cappedSuggestedTags = suggestedTags.slice(0, remainingSlots);

  let targetBusinessId = d.target_business_id ?? null;
  if (d.target_business_slug && !targetBusinessId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", d.target_business_slug)
      .maybeSingle();
    targetBusinessId = biz?.id ? String(biz.id) : null;
  }

  const isUpdate = Boolean(targetBusinessId);
  const locations: FreeOnboardLocationPayload[] = d.locations.map((l) => {
    const town = townById.get(l.town_id);
    return {
      id: locationId(),
      town_id: l.town_id,
      town_title: town?.title ?? null,
      town_slug: town?.slug ?? null,
      address: l.address,
      status: "pending" as const,
    };
  });

  const categoryTitle = category ? String(category.title ?? "") : null;

  // search_keywords are derived server-side from name, type, category, and tags.
  const searchKeywords = buildFreeOnboardSearchKeywords({
    title: d.title,
    isStorefront: d.is_storefront,
    isServiceBusiness: d.is_service_business,
    categoryTitle: categoryTitle ?? d.suggested_category,
    serviceCategoryTitle: null,
    searchTags: cappedSearchTags,
    suggestedTags: cappedSuggestedTags,
  });

  const payload: FreeOnboardPayload = {
    source: "free_onboard",
    submitter_name: submitterName,
    submitter_email: submitterEmail,
    title: d.title,
    is_storefront: d.is_storefront,
    is_service_business: d.is_service_business,
    website: d.website,
    phone: d.phone,
    excerpt: d.excerpt,
    overview: d.overview,
    category_id: d.category_id,
    category_title: categoryTitle,
    service_category_id: null,
    service_category_title: null,
    search_tags: cappedSearchTags,
    suggested_tags: cappedSuggestedTags,
    suggested_category: d.suggested_category,
    is_explorable: false,
    search_keywords: searchKeywords,
    marketing_opt_in: submittedByAdmin ? false : d.marketing_opt_in,
    target_business_id: targetBusinessId,
    locations,
    ...(mainImageUrl !== undefined ? { main_image_url: mainImageUrl } : {}),
    submitted_by_admin: submittedByAdmin,
  };

  const reviewType = isUpdate ? FREE_ONBOARD_TYPES.update : FREE_ONBOARD_TYPES.newListing;

  const { data: reviewItem, error: reviewErr } = await supabase
    .from("portal_review_items")
    .insert({
      type: reviewType,
      status: "pending",
      submitted_by: null,
      business_id: targetBusinessId,
      payload,
    })
    .select("id")
    .single();

  if (reviewErr || !reviewItem) {
    console.error("[free-onboard] portal_review_items insert", reviewErr);
    return NextResponse.json(
      {
        error:
          "Could not save your request. If this keeps happening, email add@whereto30a.com.",
      },
      { status: 500 },
    );
  }

  // Confirm receipt to the submitter (decision email comes later when live/rejected).
  // Admin intakes skip submitter mail — operator already knows they filed it.
  if (!submittedByAdmin) {
    await sendFreeOnboardSubmitterEmail({
      to: submitterEmail,
      event: "received",
      businessTitle: d.title,
      isUpdate,
    });
  }

  let similarCount = 0;
  try {
    const primaryTown = locations[0]?.town_id;
    if (primaryTown) {
      const similar = await findSimilarBusinessesForListingRequest(supabase, {
        title: d.title,
        townId: primaryTown,
        mapLat: null,
        mapLng: null,
      });
      similarCount = similar.responseHits.length;
    }
  } catch (e) {
    console.error("findSimilarBusinessesForListingRequest", e);
  }

  const toEmail =
    process.env.LISTING_NOTIFICATION_TO_EMAIL?.trim() || LISTING_NOTIFICATION_TO_EMAIL_DEFAULT;

  // Skip ops alert when an admin filed the intake (they already have the queue).
  if (!submittedByAdmin) {
    const baseUrl = getSiteUrl().replace(/\/$/, "");
    const locLines = locations
      .map((l, i) => {
        const town = townById.get(l.town_id);
        return `${i + 1}. ${town?.title ?? l.town_id}${l.address ? ` - ${l.address}` : ""}`;
      })
      .join("\n");

    const categoryLine = `Category: ${categoryTitle ?? d.suggested_category ?? "(none)"}`;

    const textBody = [
      isUpdate ? "Free onboard UPDATE request" : "Free onboard NEW listing request",
      "",
      `Submitter: ${submitterName} <${submitterEmail}>`,
      `Business: ${d.title}`,
      `Storefront: ${d.is_storefront ? "yes" : "no"}`,
      `Service: ${d.is_service_business ? "yes" : "no"}`,
      categoryLine,
      d.suggested_category && !categoryTitle
        ? `Suggested category: ${d.suggested_category}`
        : d.suggested_category
          ? `Suggested category (also): ${d.suggested_category}`
          : null,
      `Marketing opt-in: ${d.marketing_opt_in ? "yes" : "no"}`,
      "",
      "Locations:",
      locLines || "(service, no fixed location)",
      "",
      `Excerpt: ${d.excerpt}`,
      "",
      `Overview: ${d.overview}`,
      "",
      `Search tags: ${cappedSearchTags.join(", ") || "(none)"}`,
      `Suggested tags: ${cappedSuggestedTags.join(", ") || "(none)"}`,
      `Search keywords (auto): ${searchKeywords ?? "(none)"}`,
      d.website ? `Website: ${d.website}` : null,
      d.phone ? `Phone: ${d.phone}` : null,
      targetBusinessId ? `Target business id: ${targetBusinessId}` : null,
      "",
      `Review queue: ${baseUrl}/admin/review`,
      `Review item: ${reviewItem.id}`,
    ]
      .filter((line) => line != null)
      .join("\n");

    const htmlCategoryValue = categoryTitle ?? d.suggested_category ?? "(none)";

    const detailsHtml = `
<p>Submitted via <strong>/list-your-business</strong> (free_onboard).</p>
<p><strong>Submitter:</strong> ${escapeHtml(submitterName)} &lt;${escapeHtml(submitterEmail)}&gt;</p>
<p><strong>Business:</strong> ${escapeHtml(d.title)}<br/>
<strong>Storefront:</strong> ${d.is_storefront ? "yes" : "no"} · <strong>Service:</strong> ${d.is_service_business ? "yes" : "no"}<br/>
<strong>Category:</strong> ${escapeHtml(htmlCategoryValue)}<br/>
${
  d.suggested_category
    ? `<strong>Suggested category:</strong> ${escapeHtml(d.suggested_category)}<br/>`
    : ""
}
<strong>Marketing opt-in:</strong> ${d.marketing_opt_in ? "yes" : "no"}</p>
<h2 style="font-size:16px;margin:16px 0 8px;color:#1c3257">Locations</h2>
${
  locations.length === 0
    ? "<p>(service, no fixed location)</p>"
    : `<ol>${locations
        .map((l) => {
          const town = townById.get(l.town_id);
          return `<li>${escapeHtml(town?.title ?? l.town_id)}${l.address ? ` - ${escapeHtml(l.address)}` : ""}</li>`;
        })
        .join("")}</ol>`
}
<p><strong>Excerpt:</strong> ${escapeHtml(d.excerpt)}</p>
<p><strong>Overview:</strong><br/>${escapeHtml(d.overview).replace(/\r?\n/g, "<br>")}</p>
<p><strong>Search tags:</strong> ${escapeHtml(cappedSearchTags.join(", ") || "(none)")}<br/>
<strong>Suggested tags:</strong> ${escapeHtml(cappedSuggestedTags.join(", ") || "(none)")}<br/>
<strong>Search keywords (auto):</strong> ${escapeHtml(searchKeywords ?? "(none)")}</p>
<p style="margin-top:12px;font-size:13px;color:#5a6b6d">Review item ${escapeHtml(String(reviewItem.id))}</p>`;

    try {
      const rendered = await buildAdminAlertEmail({
        subject: `[WhereTo30A] ${isUpdate ? "Update" : "Listing"} request: ${d.title}`,
        headline: isUpdate ? "Free intake update" : "Free intake new listing",
        lead: "A free onboard request is waiting in the review queue.",
        detailsHtml,
        text: textBody,
        cta: { url: `${baseUrl}/admin/review`, label: "Open review queue" },
      });
      await sendTransactionalEmail({
        from: listingFromAddress(),
        to: toEmail,
        replyTo: submitterEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        logLabel: "free-onboard-admin",
      });
    } catch (emailErr) {
      console.error("resend.emails.send free onboard", emailErr);
      // Queue row already saved — still succeed for the submitter
    }
  }

  const ph = getPostHogServerClient();
  if (ph) {
    ph.capture({
      distinctId: submitterEmail,
      event: "listing_request_received",
      properties: {
        business_title: d.title,
        free_onboard: true,
        is_update: isUpdate,
        location_count: locations.length,
        similar_count: similarCount,
        review_item_id: reviewItem.id,
        marketing_opt_in: d.marketing_opt_in,
      },
    });
    await ph.shutdown();
  }

  return NextResponse.json({ ok: true, review_item_id: reviewItem.id });
}
