import { Resend } from "resend";
import { OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";

export async function humanReviewWorkflow(payload: Record<string, string>) {
  "use workflow";

  await notifyHumanReview(payload);
}

async function notifyHumanReview(payload: Record<string, string>) {
  "use step";

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.FEEDBACK_NOTIFICATION_TO_EMAIL?.trim() || "feedback@whereto30a.com";
  const from =
    process.env.FEEDBACK_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    OUTBOUND_CONTACT_FROM_DEFAULT;

  if (!resendKey) {
    console.error("[workflow] human-review: missing RESEND_API_KEY");
    return;
  }

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from,
    to,
    subject: `[Ask] Human review needed`,
    text: [
      "Human review task created from Ask Engine",
      "",
      `Task ID: ${payload.taskId}`,
      `Reason: ${payload.reason}`,
    ].join("\n"),
  });
}
