import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";
import { normalizeSearchTagSlug } from "@/lib/discovery-filters/search-tag-label";
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

  if (isListingRequestRateLimited(`listing-req:${rateLimitKeyFromRequest(request)}`)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  if (d.is_storefront && d.is_service_business) {
    return NextResponse.json(
      { error: "Choose either a physical location or a service business — not both." },
      { status: 400 },
    );
  }

  if (!d.is_storefront && !d.is_service_business) {
    return NextResponse.json(
      { error: "Select whether you have a physical location or operate as a service business." },
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
        .select("id, title")
        .eq("id", d.category_id)
        .maybeSingle()
    : { data: null };
  if (d.is_storefront && !category) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }

  const { data: serviceCategory } = d.service_category_id
    ? await supabase
        .from("service_categories")
        .select("id, title")
        .eq("id", d.service_category_id)
        .is("archived_at", null)
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .maybeSingle()
    : { data: null };
  if (d.is_service_business && !serviceCategory) {
    return NextResponse.json({ error: "Choose a valid service specialty." }, { status: 400 });
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
  const serviceCategoryTitle = serviceCategory ? String(serviceCategory.title ?? "") : null;

  const payload: FreeOnboardPayload = {
    source: "free_onboard",
    submitter_name: d.submitter_name,
    submitter_email: d.submitter_email,
    title: d.title,
    is_storefront: d.is_storefront,
    is_service_business: d.is_service_business,
    website: d.website,
    phone: d.phone,
    excerpt: d.excerpt,
    overview: d.overview,
    category_id: d.is_storefront ? d.category_id : null,
    category_title: d.is_storefront ? categoryTitle : null,
    service_category_id: d.is_service_business ? d.service_category_id : null,
    service_category_title: d.is_service_business ? serviceCategoryTitle : null,
    search_tags: cappedSearchTags,
    suggested_tags: cappedSuggestedTags,
    search_keywords: d.search_keywords,
    marketing_opt_in: d.marketing_opt_in,
    target_business_id: targetBusinessId,
    locations,
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
  await sendFreeOnboardSubmitterEmail({
    to: d.submitter_email,
    event: "received",
    businessTitle: d.title,
    isUpdate,
  });

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

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.LISTING_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    OUTBOUND_CONTACT_FROM_DEFAULT;
  const toEmail =
    process.env.LISTING_NOTIFICATION_TO_EMAIL?.trim() || LISTING_NOTIFICATION_TO_EMAIL_DEFAULT;

  if (resendKey) {
    const baseUrl = getSiteUrl().replace(/\/$/, "");
    const locLines = locations
      .map((l, i) => {
        const town = townById.get(l.town_id);
        return `${i + 1}. ${town?.title ?? l.town_id}${l.address ? ` — ${l.address}` : ""}`;
      })
      .join("\n");

    const categoryLine = d.is_service_business
      ? `Specialty: ${serviceCategoryTitle ?? "(none)"}`
      : `Category: ${categoryTitle ?? "(none)"}`;

    const textBody = [
      isUpdate ? "Free onboard UPDATE request" : "Free onboard NEW listing request",
      "",
      `Submitter: ${d.submitter_name} <${d.submitter_email}>`,
      `Business: ${d.title}`,
      categoryLine,
      `Marketing opt-in: ${d.marketing_opt_in ? "yes" : "no"}`,
      "",
      "Locations:",
      locLines || "(service — no fixed location)",
      "",
      `Excerpt: ${d.excerpt}`,
      "",
      `Overview: ${d.overview}`,
      "",
      `Search tags: ${cappedSearchTags.join(", ") || "(none)"}`,
      `Suggested tags: ${cappedSuggestedTags.join(", ") || "(none)"}`,
      `Search keywords: ${d.search_keywords ?? "(none)"}`,
      d.website ? `Website: ${d.website}` : null,
      d.phone ? `Phone: ${d.phone}` : null,
      targetBusinessId ? `Target business id: ${targetBusinessId}` : null,
      "",
      `Review queue: ${baseUrl}/admin/review`,
      `Review item: ${reviewItem.id}`,
    ]
      .filter((line) => line != null)
      .join("\n");

    const htmlCategoryLabel = d.is_service_business ? "Specialty" : "Category";
    const htmlCategoryValue = d.is_service_business
      ? (serviceCategoryTitle ?? "(none)")
      : (categoryTitle ?? "(none)");

    const htmlBody = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<h1 style="font-size:18px">${isUpdate ? "Free intake update" : "Free intake new listing"}</h1>
<p>Submitted via <strong>/list-your-business</strong> (free_onboard).</p>
<p><strong>Submitter:</strong> ${escapeHtml(d.submitter_name)} &lt;${escapeHtml(d.submitter_email)}&gt;</p>
<p><strong>Business:</strong> ${escapeHtml(d.title)}<br/>
<strong>${htmlCategoryLabel}:</strong> ${escapeHtml(htmlCategoryValue)}<br/>
<strong>Marketing opt-in:</strong> ${d.marketing_opt_in ? "yes" : "no"}</p>
<h2>Locations</h2>
${
  locations.length === 0
    ? "<p>(service — no fixed location)</p>"
    : `<ol>${locations
        .map((l) => {
          const town = townById.get(l.town_id);
          return `<li>${escapeHtml(town?.title ?? l.town_id)}${l.address ? ` — ${escapeHtml(l.address)}` : ""}</li>`;
        })
        .join("")}</ol>`
}
<p><strong>Excerpt:</strong> ${escapeHtml(d.excerpt)}</p>
<p><strong>Overview:</strong><br/>${escapeHtml(d.overview).replace(/\r?\n/g, "<br>")}</p>
<p><strong>Search tags:</strong> ${escapeHtml(cappedSearchTags.join(", ") || "(none)")}<br/>
<strong>Suggested tags:</strong> ${escapeHtml(cappedSuggestedTags.join(", ") || "(none)")}<br/>
<strong>Search keywords:</strong> ${escapeHtml(d.search_keywords ?? "(none)")}</p>
<p><a href="${escapeHtml(`${baseUrl}/admin/review`)}">Open review queue</a> · item ${escapeHtml(String(reviewItem.id))}</p>
</body></html>`;

    const resend = new Resend(resendKey);
    const { error: emailErr } = await resend.emails.send({
      from: fromEmail.includes("<") ? fromEmail : `WhereTo30A <${fromEmail}>`,
      to: [toEmail],
      replyTo: d.submitter_email,
      subject: `[WhereTo30A] ${isUpdate ? "Update" : "Listing"} request: ${d.title}`,
      text: textBody,
      html: htmlBody,
    });
    if (emailErr) {
      console.error("resend.emails.send free onboard", emailErr);
      // Queue row already saved — still succeed for the submitter
    }
  } else {
    console.error("[free-onboard] Missing RESEND_API_KEY — queue saved without email");
  }

  const ph = getPostHogServerClient();
  if (ph) {
    ph.capture({
      distinctId: d.submitter_email,
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
