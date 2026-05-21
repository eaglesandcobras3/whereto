import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { isListingRequestRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { getSiteUrl } from "@/lib/site-url";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { escapeHtml } from "@/lib/string/escape-html";

const CLAIM_NOTIFICATION_TO_EMAIL_DEFAULT = "claim@whereto30a.com";

const bodySchema = z.object({
  _hp_company_phone: z.string().max(200).optional(),
  business_slug: z.string().trim().min(1).max(220),
  submitter_name: z.string().trim().min(1).max(120),
  submitter_email: z.string().trim().email().max(320),
  submitter_phone: z
    .string()
    .max(40)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  relationship: z
    .string()
    .max(200)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  changes_requested: z.string().trim().min(15).max(4000),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: issues.fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;
  if ((d._hp_company_phone ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const ipKey = rateLimitKeyFromRequest(request);
  if (isListingRequestRateLimited(`biz-claim-email:${ipKey}`)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.CLAIM_NOTIFICATION_FROM_EMAIL?.trim() ?? process.env.LISTING_NOTIFICATION_FROM_EMAIL?.trim() ?? "";
  const toRaw = process.env.CLAIM_NOTIFICATION_TO_EMAIL?.trim();
  const toEmail = toRaw || CLAIM_NOTIFICATION_TO_EMAIL_DEFAULT;

  if (!resendKey || !fromEmail) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: bizRow, error: bizErr } = await supabase
    .from("businesses_view")
    .select("id, title, slug")
    .eq("slug", d.business_slug)
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .maybeSingle();

  if (bizErr || !bizRow) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const bizTitle = String((bizRow as { title: string }).title);
  const slug = String((bizRow as { slug: string }).slug);
  const bizId = String((bizRow as { id: string }).id);

  const baseUrl = getSiteUrl().replace(/\/$/, "");
  const listingUrl = `${baseUrl}/business/${encodeURIComponent(slug)}`;

  const approxClient = ipKey;

  const simplerTextParts: string[] = [
    `Business claim / correction request (${listingUrl})`,
    "",
    `Listing: ${bizTitle}`,
    `Slug: ${slug}`,
    `ID: ${bizId}`,
    "",
    `From: ${d.submitter_name} <${d.submitter_email}>${d.submitter_phone ? ` / ${d.submitter_phone}` : ""}`,
  ];
  if (d.relationship) {
    simplerTextParts.push(`Relationship: ${d.relationship}`);
  }
  simplerTextParts.push(
    "",
    "Requested changes:",
    d.changes_requested,
    "",
    `Approx. client IP: ${approxClient}`,
  );
  const ua = request.headers.get("user-agent");
  if (ua) simplerTextParts.push(`User-Agent: ${ua.slice(0, 500)}`);

  const textBody = simplerTextParts.join("\n");

  const pairs: [string, string][] = [
    ["Listing title", bizTitle],
    ["URL", listingUrl],
    ["Slug", slug],
    ["Listing ID", bizId],
    ["Submitter name", d.submitter_name],
    ["Submitter email", d.submitter_email],
    ...(d.submitter_phone ? ([["Submitter phone", d.submitter_phone]] as [string, string][]) : []),
    ...(d.relationship ? ([["Relationship / role", d.relationship]] as [string, string][]) : []),
    ["Requested updates", d.changes_requested],
  ];

  const detailsRows = pairs
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:left;vertical-align:top;padding:6px 12px 6px 0">${escapeHtml(k)}</th><td style="padding:6px 0">${escapeHtml(v).replace(/\r?\n/g, "<br>")}</td></tr>`,
    )
    .join("");

  const htmlBody = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<h1 style="font-size:18px">Business claim / listing update request</h1>
<p style="color:#444">Someone used the form on your public listing page.</p>
<p><a href="${escapeHtml(listingUrl)}">${escapeHtml(listingUrl)}</a></p>
<table style="border-collapse:collapse">${detailsRows}</table>
<p style="margin-top:16px;color:#444;font-size:13px"><strong>Technical</strong><br/>
Approx. client IP: ${escapeHtml(approxClient)}<br/>
${ua ? `User-Agent: ${escapeHtml(ua.slice(0, 500))}` : ""}</p>
</body></html>`;

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: fromEmail.includes("<") ? fromEmail : `WhereTo30A <${fromEmail}>`,
    to: [toEmail],
    replyTo: d.submitter_email,
    subject: `[WhereTo30A] Claim / update: ${bizTitle}`,
    text: textBody,
    html: htmlBody,
  });

  if (error) {
    console.error("resend.emails.send business claim email", error);
    return NextResponse.json({ error: "Could not send request." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
