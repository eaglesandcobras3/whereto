import "server-only";

import { Resend } from "resend";

import { OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";

export function formatFromAddress(
  raw: string | undefined | null,
  displayName = "WhereTo30A",
): string {
  const address = raw?.trim() || OUTBOUND_CONTACT_FROM_DEFAULT;
  return address.includes("<") ? address : `${displayName} <${address}>`;
}

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
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.error(`[${opts.logLabel}] Missing RESEND_API_KEY`);
    return;
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
  }
}
