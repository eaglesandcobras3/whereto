import "server-only";

import { Resend } from "resend";

import { formatFromAddress } from "@/lib/email/outbound-defaults";

export { formatFromAddress } from "@/lib/email/outbound-defaults";

export function portalFromAddress(): string {
  return formatFromAddress(
    process.env.PORTAL_NOTIFICATION_FROM_EMAIL || process.env.RESEND_FROM_EMAIL,
  );
}

export function listingFromAddress(): string {
  return formatFromAddress(
    process.env.LISTING_NOTIFICATION_FROM_EMAIL ||
      process.env.PORTAL_NOTIFICATION_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL,
  );
}

export async function sendTransactionalEmail(opts: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  logLabel: string;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.error(`[${opts.logLabel}] Missing RESEND_API_KEY`);
    return false;
  }

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: opts.from,
    to: [opts.to],
    subject: opts.subject,
    text: opts.text,
    ...(opts.html ? { html: opts.html } : {}),
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });

  if (error) {
    console.error(`[${opts.logLabel}]`, error);
    return false;
  }
  return true;
}
