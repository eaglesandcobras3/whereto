import { Resend } from "resend";
import { OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";

export type PortalNotificationEvent =
  | "claim_submitted"
  | "claim_approved"
  | "claim_rejected"
  | "listing_submitted"
  | "listing_approved"
  | "listing_rejected"
  | "edit_submitted"
  | "edit_approved"
  | "edit_rejected"
  | "photo_submitted"
  | "photo_approved"
  | "photo_rejected"
  | "payment_success"
  | "payment_failed"
  | "subscription_upgraded"
  | "review_needs_changes";

const SUBJECTS: Record<PortalNotificationEvent, (ctx: { businessTitle: string }) => string> = {
  claim_submitted: ({ businessTitle }) => `Your claim for ${businessTitle} is under review`,
  claim_approved: ({ businessTitle }) => `You're now managing ${businessTitle} on WhereTo30A`,
  claim_rejected: ({ businessTitle }) => `Update on your claim for ${businessTitle}`,
  listing_submitted: ({ businessTitle }) => `We received your listing for ${businessTitle}`,
  listing_approved: ({ businessTitle }) => `${businessTitle} is now live on WhereTo30A`,
  listing_rejected: ({ businessTitle }) => `Update on your listing submission`,
  edit_submitted: ({ businessTitle }) => `Your edits to ${businessTitle} are under review`,
  edit_approved: ({ businessTitle }) => `Your edits to ${businessTitle} are live`,
  edit_rejected: ({ businessTitle }) => `Update on your edit request for ${businessTitle}`,
  photo_submitted: ({ businessTitle }) => `Your photo for ${businessTitle} is under review`,
  photo_approved: ({ businessTitle }) => `Your photo for ${businessTitle} was approved`,
  photo_rejected: ({ businessTitle }) => `Update on your photo for ${businessTitle}`,
  payment_success: ({ businessTitle }) => `Local Partner plan active for ${businessTitle}`,
  payment_failed: ({ businessTitle }) => `Action needed: payment failed for ${businessTitle}`,
  subscription_upgraded: ({ businessTitle }) => `Your plan for ${businessTitle} was upgraded`,
  review_needs_changes: ({ businessTitle }) => `Changes requested for ${businessTitle}`,
};

const BODIES: Record<
  PortalNotificationEvent,
  (ctx: { businessTitle: string; adminNotes?: string | null }) => string
> = {
  claim_submitted: ({ businessTitle }) =>
    `Thanks for claiming ${businessTitle} on WhereTo30A. Our team will review your request and email you when it's approved.`,
  claim_approved: ({ businessTitle }) =>
    `Your claim for ${businessTitle} was approved. Sign in to your Business Portal to manage your listing.`,
  claim_rejected: ({ businessTitle, adminNotes }) =>
    `We could not approve your claim for ${businessTitle} at this time.${adminNotes ? `\n\nNote from our team: ${adminNotes}` : ""}`,
  listing_submitted: ({ businessTitle }) =>
    `We received your listing request for ${businessTitle}. We'll review it and email you when it's live.`,
  listing_approved: ({ businessTitle }) =>
    `Good news. ${businessTitle} is now live on WhereTo30A. Visit your Business Portal to keep your listing up to date.`,
  listing_rejected: ({ businessTitle, adminNotes }) =>
    `We couldn't publish ${businessTitle} as submitted.${adminNotes ? `\n\nNote from our team: ${adminNotes}` : ""}`,
  edit_submitted: ({ businessTitle }) =>
    `We received your proposed edits for ${businessTitle}. Our team will review them and apply approved changes to your live listing.`,
  edit_approved: ({ businessTitle }) =>
    `Your proposed edits for ${businessTitle} were approved and are now live on WhereTo30A.`,
  edit_rejected: ({ businessTitle, adminNotes }) =>
    `We could not apply your proposed edits for ${businessTitle}.${adminNotes ? `\n\nNote from our team: ${adminNotes}` : ""}`,
  photo_submitted: ({ businessTitle }) =>
    `We received a new photo for ${businessTitle}. We'll review it and add it to your listing when approved.`,
  photo_approved: ({ businessTitle }) =>
    `Your photo for ${businessTitle} was approved and is now on your listing.`,
  photo_rejected: ({ businessTitle, adminNotes }) =>
    `We could not use the photo you submitted for ${businessTitle}.${adminNotes ? `\n\nNote from our team: ${adminNotes}` : ""}`,
  payment_success: ({ businessTitle }) =>
    `Your Local Partner plan for ${businessTitle} is now active. Sign in to your Business Portal to add hours, social links, more photos, and a full description.`,
  payment_failed: ({ businessTitle }) =>
    `We couldn't process your latest payment for ${businessTitle}. Update your payment method in the Business Portal billing section to keep Local Partner benefits.`,
  subscription_upgraded: ({ businessTitle }) =>
    `Your plan for ${businessTitle} was upgraded. Sign in to your Business Portal to use your new features.`,
  review_needs_changes: ({ businessTitle, adminNotes }) =>
    `Our team requested changes to your submission for ${businessTitle}.${adminNotes ? `\n\nNote from our team: ${adminNotes}` : ""}\n\nSign in to your Business Portal to update and resubmit.`,
};

export async function sendPortalInviteEmail(opts: {
  to: string;
  businessTitle: string;
  acceptUrl: string;
  inviterEmail?: string | null;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.error("[portal-invite] Missing RESEND_API_KEY");
    return;
  }

  const resend = new Resend(resendKey);
  const subject = `You're invited to manage ${opts.businessTitle} on WhereTo30A`;
  const inviter = opts.inviterEmail ? `\n\nInvited by: ${opts.inviterEmail}` : "";
  const text = `You've been invited to help manage ${opts.businessTitle} on WhereTo30A.${inviter}\n\nAccept the invite:\n${opts.acceptUrl}\n\nThis link expires in 7 days.`;

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [opts.to],
    subject,
    text,
  });

  if (error) {
    console.error("[portal-invite]", error);
  }
}

function fromAddress(): string {
  const raw =
    process.env.PORTAL_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    OUTBOUND_CONTACT_FROM_DEFAULT;
  return raw.includes("<") ? raw : `WhereTo30A <${raw}>`;
}

export async function sendPortalOwnerEmail(opts: {
  to: string;
  event: PortalNotificationEvent;
  businessTitle: string;
  adminNotes?: string | null;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.error("[portal-notification] Missing RESEND_API_KEY");
    return;
  }

  const resend = new Resend(resendKey);
  const subject = SUBJECTS[opts.event]({ businessTitle: opts.businessTitle });
  const text = BODIES[opts.event]({
    businessTitle: opts.businessTitle,
    adminNotes: opts.adminNotes,
  });

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [opts.to],
    subject,
    text,
  });

  if (error) {
    console.error("[portal-notification]", opts.event, error);
  }
}
