import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { findSimilarBusinessesForListingRequest } from "@/lib/listing-requests/find-similar-businesses";
import { isListingRequestRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { getSiteUrl } from "@/lib/site-url";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { escapeHtml } from "@/lib/string/escape-html";

const LISTING_NOTIFICATION_TO_EMAIL_DEFAULT = "add@whereto30a.com";

const optionalUrl = z
  .string()
  .max(500)
  .optional()
  .transform((s) => (s ?? "").trim())
  .refine((s) => s === "" || /^https?:\/\/.+/i.test(s), "Use a full URL starting with http:// or https://");

const bodySchema = z.object({
  _hp_company_website: z.string().max(200).optional(),
  submitter_name: z.string().trim().min(1).max(120),
  submitter_email: z.string().trim().email().max(320),
  submitter_phone: z
    .string()
    .max(40)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  title: z.string().trim().min(2).max(200),
  town_id: z.string().uuid(),
  address: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  website: optionalUrl.transform((s) => (s === "" ? null : s)),
  phone: z
    .string()
    .max(40)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  email: z
    .string()
    .max(320)
    .optional()
    .transform((s) => (s ?? "").trim() || null)
    .refine((s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Invalid business email"),
  description: z.string().trim().min(15).max(4000),
  is_storefront: z.boolean().optional().default(false),
  is_service_business: z.boolean().optional().default(false),
  service_area: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  map_lat: z
    .union([z.number(), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v == null || !Number.isFinite(v) ? null : v)),
  map_lng: z
    .union([z.number(), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v == null || !Number.isFinite(v) ? null : v)),
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
  if ((d._hp_company_website ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  if (isListingRequestRateLimited(`listing-req:${rateLimitKeyFromRequest(request)}`)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.LISTING_NOTIFICATION_FROM_EMAIL?.trim();
  const toRaw = process.env.LISTING_NOTIFICATION_TO_EMAIL?.trim();
  const toEmail = toRaw || LISTING_NOTIFICATION_TO_EMAIL_DEFAULT;

  if (!resendKey || !fromEmail) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!d.is_storefront && !d.is_service_business) {
    return NextResponse.json(
      { error: "Select whether you have a storefront, offer on-site/mobile service, or both." },
      { status: 400 },
    );
  }

  const { data: town, error: townErr } = await supabase
    .from("towns")
    .select("id, title")
    .eq("id", d.town_id)
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .maybeSingle();

  if (townErr || !town) {
    return NextResponse.json({ error: "Choose a valid town." }, { status: 400 });
  }

  const townTitle = (town as { title: string }).title;

  let similar: Awaited<ReturnType<typeof findSimilarBusinessesForListingRequest>>;
  try {
    similar = await findSimilarBusinessesForListingRequest(supabase, {
      title: d.title,
      townId: d.town_id,
      mapLat: d.map_lat,
      mapLng: d.map_lng,
    });
  } catch (e) {
    console.error("findSimilarBusinessesForListingRequest", e);
    return NextResponse.json({ error: "Could not complete request." }, { status: 500 });
  }

  const { responseHits } = similar;

  const baseUrl = getSiteUrl().replace(/\/$/, "");
  const storefrontLine = [d.is_storefront ? "Storefront / fixed location" : null, d.is_service_business ? "Mobile / regional service" : null]
    .filter(Boolean)
    .join("; ");

  const approxClient = rateLimitKeyFromRequest(request);

  const pairs: [string, string | null][] = [
    ["Submitter name", d.submitter_name],
    ["Submitter email", d.submitter_email],
    ["Submitter phone", d.submitter_phone],
    ["Business title", d.title],
    ["Primary town", townTitle],
    ["How they operate", storefrontLine],
    ["Address", d.address],
    ["Service area", d.service_area],
    ["Website", d.website],
    ["Business phone", d.phone],
    ["Business email", d.email],
    ["Latitude", d.map_lat != null ? String(d.map_lat) : null],
    ["Longitude", d.map_lng != null ? String(d.map_lng) : null],
    ["Description", d.description],
  ];

  const simplerTextParts: string[] = [
    "New listing request — WhereTo30A /list-your-business",
    "",
    `Submitter: ${d.submitter_name} <${d.submitter_email}>${d.submitter_phone ? ` / ${d.submitter_phone}` : ""}`,
    `Business: ${d.title}`,
    `Town: ${townTitle}`,
    `Operation: ${storefrontLine}`,
  ];
  if (d.address) simplerTextParts.push(`Address: ${d.address}`);
  if (d.service_area) simplerTextParts.push(`Service area: ${d.service_area}`);
  if (d.website) simplerTextParts.push(`Website: ${d.website}`);
  if (d.phone) simplerTextParts.push(`Business phone: ${d.phone}`);
  if (d.email) simplerTextParts.push(`Business email: ${d.email}`);
  if (d.map_lat != null || d.map_lng != null) {
    simplerTextParts.push(`Map: ${d.map_lat ?? "?"}, ${d.map_lng ?? "?"}`);
  }
  simplerTextParts.push("", "Description:", d.description);
  simplerTextParts.push("", `Approx. client IP: ${approxClient}`);
  const ua = request.headers.get("user-agent");
  if (ua) simplerTextParts.push(`User-Agent: ${ua.slice(0, 500)}`);

  if (responseHits.length > 0) {
    simplerTextParts.push("", "Possible existing listings (similar name):");
    for (const h of responseHits) {
      simplerTextParts.push(
        `- ${h.title}: ${baseUrl}/business/${encodeURIComponent(h.slug)} (${Math.round(h.similarity * 100)}% match)`,
      );
    }
  }

  const textBody = simplerTextParts.join("\n");

  let similarHtml = "";
  if (responseHits.length > 0) {
    const items = responseHits
      .map(
        (h) => {
          const href = `${baseUrl}/business/${encodeURIComponent(h.slug)}`;
          return `<li><a href="${escapeHtml(href)}">${escapeHtml(h.title)}</a> (${Math.round(h.similarity * 100)}% name match)</li>`;
        },
      )
      .join("");
    similarHtml = `<h2>Possible matches</h2><ul>${items}</ul>`;
  }

  const detailsRows = pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:left;vertical-align:top;padding:6px 12px 6px 0">${escapeHtml(k)}</th><td style="padding:6px 0">${escapeHtml(v!).replace(/\r?\n/g, "<br>")}</td></tr>`,
    )
    .join("");

  const htmlBody = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<h1 style="font-size:18px">New listing request</h1>
<p style="color:#444">Submitted via <strong>/list-your-business</strong>.</p>
<table style="border-collapse:collapse">${detailsRows}</table>
<p style="margin-top:16px;color:#444;font-size:13px"><strong>Technical</strong><br/>
Approx. client IP: ${escapeHtml(approxClient)}<br/>
${request.headers.get("user-agent") ? `User-Agent: ${escapeHtml(request.headers.get("user-agent")!.slice(0, 500))}` : ""}</p>
${similarHtml}</body></html>`;

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: fromEmail.includes("<") ? fromEmail : `WhereTo30A <${fromEmail}>`,
    to: [toEmail],
    replyTo: d.submitter_email,
    subject: `[WhereTo30A] Listing request: ${d.title} (${townTitle})`,
    text: textBody,
    html: htmlBody,
  });

  if (error) {
    console.error("resend.emails.send listing request", error);
    return NextResponse.json({ error: "Could not send request." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    similar: responseHits,
  });
}
