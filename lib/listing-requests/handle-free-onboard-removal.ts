import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";
import { sendFreeOnboardSubmitterEmail } from "@/lib/listing-requests/free-onboard-notify";
import {
  FREE_ONBOARD_TYPES,
  freeOnboardRemovalBodySchema,
  type FreeOnboardRemovalPayload,
} from "@/lib/listing-requests/free-onboard-schema";
import { isListingRequestRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { escapeHtml } from "@/lib/string/escape-html";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LISTING_NOTIFICATION_TO_EMAIL_DEFAULT = "add@whereto30a.com";

export async function handleFreeOnboardRemovalRequest(
  request: NextRequest,
  json: unknown,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const parsed = freeOnboardRemovalBodySchema.safeParse(json);
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

  let query = supabase
    .from("businesses")
    .select("id, title, slug")
    .is("archived_at", null);

  if (d.target_business_id) {
    query = query.eq("id", d.target_business_id);
  } else {
    query = query.eq("slug", d.target_business_slug);
  }

  const { data: business, error: bizErr } = await query.maybeSingle();
  if (bizErr || !business) {
    return NextResponse.json(
      { error: "We could not find that listing. Refresh the page and try again." },
      { status: 404 },
    );
  }

  const businessId = String(business.id);
  const title = String(business.title ?? "Listing");
  const slug = String(business.slug ?? d.target_business_slug);

  const payload: FreeOnboardRemovalPayload = {
    source: "free_onboard",
    intent: "removal",
    submitter_name: d.submitter_name,
    submitter_email: d.submitter_email,
    title,
    reason: d.reason,
    target_business_id: businessId,
    target_business_slug: slug,
  };

  const { data: reviewItem, error: reviewErr } = await supabase
    .from("portal_review_items")
    .insert({
      type: FREE_ONBOARD_TYPES.removal,
      status: "pending",
      submitted_by: null,
      business_id: businessId,
      payload,
    })
    .select("id")
    .single();

  if (reviewErr || !reviewItem) {
    console.error("[free-onboard-removal] portal_review_items insert", reviewErr);
    return NextResponse.json(
      {
        error:
          "Could not save your request. If this keeps happening, email add@whereto30a.com.",
      },
      { status: 500 },
    );
  }

  await sendFreeOnboardSubmitterEmail({
    to: d.submitter_email,
    event: "received",
    businessTitle: title,
    isRemoval: true,
  });

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.LISTING_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    OUTBOUND_CONTACT_FROM_DEFAULT;
  const toEmail =
    process.env.LISTING_NOTIFICATION_TO_EMAIL?.trim() || LISTING_NOTIFICATION_TO_EMAIL_DEFAULT;

  if (resendKey) {
    const baseUrl = getSiteUrl().replace(/\/$/, "");
    const textBody = [
      "Free onboard REMOVAL request",
      "",
      `Submitter: ${d.submitter_name} <${d.submitter_email}>`,
      `Business: ${title}`,
      `Slug: ${slug}`,
      `Target business id: ${businessId}`,
      "",
      `Reason: ${d.reason}`,
      "",
      `Review queue: ${baseUrl}/admin/review`,
      `Review item: ${reviewItem.id}`,
    ].join("\n");

    const htmlBody = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<h1 style="font-size:18px">Free intake removal request</h1>
<p>Submitted via <strong>/list-your-business</strong> (free_onboard).</p>
<p><strong>Submitter:</strong> ${escapeHtml(d.submitter_name)} &lt;${escapeHtml(d.submitter_email)}&gt;</p>
<p><strong>Business:</strong> ${escapeHtml(title)} (<code>${escapeHtml(slug)}</code>)</p>
<p><strong>Reason:</strong><br/>${escapeHtml(d.reason).replace(/\r?\n/g, "<br>")}</p>
<p><a href="${escapeHtml(`${baseUrl}/admin/review`)}">Open review queue</a> · item ${escapeHtml(String(reviewItem.id))}</p>
</body></html>`;

    const resend = new Resend(resendKey);
    const { error: emailErr } = await resend.emails.send({
      from: fromEmail.includes("<") ? fromEmail : `WhereTo30A <${fromEmail}>`,
      to: [toEmail],
      replyTo: d.submitter_email,
      subject: `[WhereTo30A] Removal request: ${title}`,
      text: textBody,
      html: htmlBody,
    });
    if (emailErr) {
      console.error("resend.emails.send free onboard removal", emailErr);
    }
  } else {
    console.error("[free-onboard-removal] Missing RESEND_API_KEY — queue saved without email");
  }

  const ph = getPostHogServerClient();
  if (ph) {
    ph.capture({
      distinctId: d.submitter_email,
      event: "listing_request_received",
      properties: {
        business_title: title,
        free_onboard: true,
        is_removal: true,
        review_item_id: reviewItem.id,
      },
    });
    await ph.shutdown();
  }

  return NextResponse.json({ ok: true, review_item_id: reviewItem.id });
}
