import { buildAdminAlertEmail } from "@/lib/email/business-templates";
import { formatFromAddress, OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";
import { Resend } from "resend";

export async function feedbackWorkflow(payload: Record<string, string>) {
  "use workflow";

  await notifyFeedbackTeam(payload);
}

async function notifyFeedbackTeam(payload: Record<string, string>) {
  "use step";

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.FEEDBACK_NOTIFICATION_TO_EMAIL?.trim() || "feedback@whereto30a.com";
  const from = formatFromAddress(
    process.env.FEEDBACK_NOTIFICATION_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      OUTBOUND_CONTACT_FROM_DEFAULT,
  );

  if (!resendKey) {
    console.error("[workflow] feedback: missing RESEND_API_KEY");
    return;
  }

  const text = `AI feedback record ${payload.feedbackId} from ${payload.email}`;
  const detailsHtml = `
<p><strong>Feedback ID:</strong> ${payload.feedbackId ?? ""}</p>
<p><strong>Email:</strong> ${payload.email ?? ""}</p>`;

  let html: string | undefined;
  try {
    const rendered = await buildAdminAlertEmail({
      subject: `[Ask] Listing feedback ${payload.feedbackId ?? ""}`,
      headline: "Ask listing feedback",
      lead: "Ask Engine recorded listing feedback.",
      detailsHtml,
      text,
    });
    html = rendered.html;
  } catch (err) {
    console.error("[workflow] feedback: MJML render failed", err);
  }

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from,
    to,
    subject: `[Ask] Listing feedback ${payload.feedbackId ?? ""}`,
    text,
    ...(html ? { html } : {}),
  });
}
