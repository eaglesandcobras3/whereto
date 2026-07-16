import { buildAdminAlertEmail } from "@/lib/email/business-templates";
import { formatFromAddress, OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";
import { Resend } from "resend";

export async function humanReviewWorkflow(payload: Record<string, string>) {
  "use workflow";

  await notifyHumanReview(payload);
}

async function notifyHumanReview(payload: Record<string, string>) {
  "use step";

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.FEEDBACK_NOTIFICATION_TO_EMAIL?.trim() || "feedback@whereto30a.com";
  const from = formatFromAddress(
    process.env.FEEDBACK_NOTIFICATION_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      OUTBOUND_CONTACT_FROM_DEFAULT,
  );

  if (!resendKey) {
    console.error("[workflow] human-review: missing RESEND_API_KEY");
    return;
  }

  const text = [
    "Human review task created from Ask Engine",
    "",
    `Task ID: ${payload.taskId}`,
    `Reason: ${payload.reason}`,
  ].join("\n");

  const detailsHtml = `
<p><strong>Task ID:</strong> ${payload.taskId ?? ""}</p>
<p><strong>Reason:</strong> ${payload.reason ?? ""}</p>`;

  let html: string | undefined;
  try {
    const rendered = await buildAdminAlertEmail({
      subject: `[Ask] Human review needed`,
      headline: "Human review needed",
      lead: "Ask Engine created a human review task.",
      detailsHtml,
      text,
    });
    html = rendered.html;
  } catch (err) {
    console.error("[workflow] human-review: MJML render failed", err);
  }

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from,
    to,
    subject: `[Ask] Human review needed`,
    text,
    ...(html ? { html } : {}),
  });
}
