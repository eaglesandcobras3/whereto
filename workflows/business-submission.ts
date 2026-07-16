import { buildAdminAlertEmail } from "@/lib/email/business-templates";
import { formatFromAddress, OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";
import { Resend } from "resend";

export async function businessSubmissionWorkflow(payload: Record<string, string>) {
  "use workflow";

  await notifyListingTeam(payload);
}

async function notifyListingTeam(payload: Record<string, string>) {
  "use step";

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const to =
    process.env.LISTING_NOTIFICATION_TO_EMAIL?.trim() || "add@whereto30a.com";
  const from = formatFromAddress(
    process.env.LISTING_NOTIFICATION_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      OUTBOUND_CONTACT_FROM_DEFAULT,
  );

  if (!resendKey) {
    console.error("[workflow] business-submission: missing RESEND_API_KEY");
    return;
  }

  const text = [
    "New business listing request via Ask Engine",
    "",
    `Request ID: ${payload.requestId}`,
    `Title: ${payload.title}`,
    `Email: ${payload.email}`,
  ].join("\n");

  const detailsHtml = `
<p><strong>Request ID:</strong> ${payload.requestId ?? ""}</p>
<p><strong>Title:</strong> ${payload.title ?? ""}</p>
<p><strong>Email:</strong> ${payload.email ?? ""}</p>`;

  let html: string | undefined;
  try {
    const rendered = await buildAdminAlertEmail({
      subject: `[Ask] New listing request: ${payload.title ?? "Business"}`,
      headline: "Ask listing request",
      lead: "Ask Engine received a new business listing request.",
      detailsHtml,
      text,
    });
    html = rendered.html;
  } catch (err) {
    console.error("[workflow] business-submission: MJML render failed", err);
  }

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from,
    to,
    subject: `[Ask] New listing request: ${payload.title ?? "Business"}`,
    text,
    ...(html ? { html } : {}),
  });
}
