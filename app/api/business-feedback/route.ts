import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { isListingRequestRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { escapeHtml } from "@/lib/string/escape-html";
import { OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";

const FEEDBACK_TO_DEFAULT = "feedback@whereto30a.com";

const bodySchema = z.object({
  _hp_website_field: z.string().max(200).optional(),
  submitter_name: z.string().trim().min(1).max(120),
  submitter_email: z.string().trim().email().max(320),
  listing_context: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  message: z.string().trim().min(15).max(4000),
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
  if ((d._hp_website_field ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const ipKey = rateLimitKeyFromRequest(request);
  if (isListingRequestRateLimited(`biz-feedback:${ipKey}`)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.FEEDBACK_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.LISTING_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    OUTBOUND_CONTACT_FROM_DEFAULT;
  const toEmail = process.env.FEEDBACK_NOTIFICATION_TO_EMAIL?.trim() || FEEDBACK_TO_DEFAULT;

  if (!resendKey) {
    console.error("[business-feedback] Missing RESEND_API_KEY");
    const devNote =
      process.env.NODE_ENV === "development" ? " [Dev: add RESEND_API_KEY to .env.local]" : "";
    return NextResponse.json(
      {
        error: `We can't accept feedback through this form right now.${devNote} Please email ${FEEDBACK_TO_DEFAULT} directly.`,
      },
      { status: 503 },
    );
  }

  const baseUrl = getSiteUrl().replace(/\/$/, "");
  const ua = request.headers.get("user-agent");

  const textParts = [
    "Business listing feedback — WhereTo30A",
    "",
    `From: ${d.submitter_name} <${d.submitter_email}>`,
    "",
    ...(d.listing_context ? [`Listing / URL / context:\n${d.listing_context}`, ""] : []),
    "Feedback:",
    d.message,
    "",
    `Approx. client IP: ${ipKey}`,
  ];
  if (ua) textParts.push(`User-Agent: ${ua.slice(0, 500)}`);

  const textBody = textParts.join("\n");

  const listingRow = d.listing_context
    ? `<tr><th style="text-align:left;vertical-align:top;padding:6px 12px 6px 0">${escapeHtml("Listing context")}</th><td style="padding:6px 0">${escapeHtml(d.listing_context).replace(/\r?\n/g, "<br>")}</td></tr>`
    : "";
  const htmlBody = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<h1 style="font-size:18px">Listing feedback</h1>
<p style="color:#444">Submitted via <strong><a href="${escapeHtml(`${baseUrl}/feedback`)}">/feedback</a></strong>.</p>
<table style="border-collapse:collapse">
<tr><th style="text-align:left;padding:6px 12px 6px 0">${escapeHtml("Name")}</th><td style="padding:6px 0">${escapeHtml(d.submitter_name)}</td></tr>
<tr><th style="text-align:left;padding:6px 12px 6px 0">${escapeHtml("Email")}</th><td style="padding:6px 0">${escapeHtml(d.submitter_email)}</td></tr>
${listingRow}
<tr><th style="text-align:left;vertical-align:top;padding:6px 12px 6px 0">${escapeHtml("Message")}</th><td style="padding:6px 0">${escapeHtml(d.message).replace(/\r?\n/g, "<br>")}</td></tr>
</table>
<p style="margin-top:16px;color:#444;font-size:13px"><strong>Technical</strong><br/>
${escapeHtml(`Approx. client IP: ${ipKey}`)}<br/>
${ua ? `${escapeHtml(`User-Agent: ${ua.slice(0, 500)}`)}` : ""}</p>
</body></html>`;

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: fromEmail.includes("<") ? fromEmail : `WhereTo30A <${fromEmail}>`,
    to: [toEmail],
    replyTo: d.submitter_email,
    subject: `[WhereTo30A] Listing feedback — ${d.submitter_name}`,
    text: textBody,
    html: htmlBody,
  });

  if (error) {
    console.error("resend.business-feedback", error);
    return NextResponse.json({ error: "Could not send feedback." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
