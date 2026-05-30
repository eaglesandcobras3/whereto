import { Resend } from "resend";
import { OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";

export async function businessSubmissionWorkflow(payload: Record<string, string>) {
  "use workflow";

  await notifyListingTeam(payload);
}

async function notifyListingTeam(payload: Record<string, string>) {
  "use step";

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const to =
    process.env.LISTING_NOTIFICATION_TO_EMAIL?.trim() || "add@whereto30a.com";
  const from =
    process.env.LISTING_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    OUTBOUND_CONTACT_FROM_DEFAULT;

  if (!resendKey) {
    console.error("[workflow] business-submission: missing RESEND_API_KEY");
    return;
  }

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from,
    to,
    subject: `[Ask] New listing request: ${payload.title ?? "Business"}`,
    text: [
      "New business listing request via Ask Engine",
      "",
      `Request ID: ${payload.requestId}`,
      `Title: ${payload.title}`,
      `Email: ${payload.email}`,
    ].join("\n"),
  });
}
