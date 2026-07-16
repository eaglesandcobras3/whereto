import {
  buildBusinessRequestApprovedEmail,
  buildBusinessRequestReceivedEmail,
  buildListingLiveEmail,
  buildPaymentFailedEmail,
  buildPaymentSuccessEmail,
  buildPortalInviteEmail,
  buildRequestRejectedEmail,
  buildReviewNeedsChangesEmail,
  buildSubscriptionUpgradedEmail,
  portalCta,
  submitChangesCta,
  viewListingCta,
} from "@/lib/email/business-templates";
import { portalFromAddress, sendTransactionalEmail } from "@/lib/email/send";

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
  listing_approved: ({ businessTitle }) => `${businessTitle} was approved on WhereTo30A`,
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
    `Your claim for ${businessTitle} was approved. You can submit listing changes anytime on WhereTo30A.`,
  claim_rejected: ({ businessTitle, adminNotes }) =>
    `We could not approve your claim for ${businessTitle} at this time.${adminNotes ? `\n\nNote from our team: ${adminNotes}` : ""}`,
  listing_submitted: ({ businessTitle }) =>
    `We received your listing request for ${businessTitle}. We'll review it and email you when it's live.`,
  listing_approved: ({ businessTitle }) =>
    `Good news. ${businessTitle} has been approved on WhereTo30A. Submit changes anytime on the website if something needs updating.`,
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
    `Our team requested changes to your submission for ${businessTitle}.${adminNotes ? `\n\nNote from our team: ${adminNotes}` : ""}\n\nSubmit your updates on WhereTo30A when you are ready.`,
};

async function renderPortalMjmlEmail(opts: {
  event: PortalNotificationEvent;
  businessTitle: string;
  adminNotes?: string | null;
  listingUrl?: string | null;
  businessSlug?: string | null;
}): Promise<{ subject: string; text: string; html: string }> {
  const changesCta = submitChangesCta(opts.businessSlug);

  switch (opts.event) {
    case "listing_submitted":
      return buildBusinessRequestReceivedEmail({
        businessTitle: opts.businessTitle,
        requestKind: "listing",
      });
    case "edit_submitted":
      return buildBusinessRequestReceivedEmail({
        businessTitle: opts.businessTitle,
        requestKind: "update",
      });
    case "claim_submitted":
      return buildBusinessRequestReceivedEmail({
        businessTitle: opts.businessTitle,
        requestKind: "claim",
      });
    case "photo_submitted":
      return buildBusinessRequestReceivedEmail({
        businessTitle: opts.businessTitle,
        requestKind: "photo",
      });
    case "listing_approved":
      return buildBusinessRequestApprovedEmail({
        businessTitle: opts.businessTitle,
        kind: "listing",
        adminNotes: opts.adminNotes,
        listingUrl: opts.listingUrl,
      });
    case "claim_approved":
      return buildBusinessRequestApprovedEmail({
        businessTitle: opts.businessTitle,
        kind: "claim",
        adminNotes: opts.adminNotes,
        listingUrl: opts.listingUrl,
      });
    case "edit_approved":
      return buildListingLiveEmail({
        businessTitle: opts.businessTitle,
        variant: "update",
        listingUrls: opts.listingUrl ? [opts.listingUrl] : undefined,
        cta: opts.listingUrl ? viewListingCta(opts.listingUrl) : null,
      });
    case "photo_approved":
      return buildListingLiveEmail({
        businessTitle: opts.businessTitle,
        variant: "photo",
        listingUrls: opts.listingUrl ? [opts.listingUrl] : undefined,
        cta: opts.listingUrl ? viewListingCta(opts.listingUrl) : null,
      });
    case "claim_rejected":
      return buildRequestRejectedEmail({
        businessTitle: opts.businessTitle,
        kind: "claim",
        adminNotes: opts.adminNotes,
        cta: changesCta,
      });
    case "listing_rejected":
      return buildRequestRejectedEmail({
        businessTitle: opts.businessTitle,
        kind: "listing",
        adminNotes: opts.adminNotes,
        cta: changesCta,
      });
    case "edit_rejected":
      return buildRequestRejectedEmail({
        businessTitle: opts.businessTitle,
        kind: "edit",
        adminNotes: opts.adminNotes,
        cta: changesCta,
      });
    case "photo_rejected":
      return buildRequestRejectedEmail({
        businessTitle: opts.businessTitle,
        kind: "photo",
        adminNotes: opts.adminNotes,
        cta: changesCta,
      });
    case "review_needs_changes":
      return buildReviewNeedsChangesEmail({
        businessTitle: opts.businessTitle,
        adminNotes: opts.adminNotes,
        cta: changesCta,
      });
    case "payment_success":
      return buildPaymentSuccessEmail({
        businessTitle: opts.businessTitle,
        cta: portalCta(),
      });
    case "payment_failed":
      return buildPaymentFailedEmail({
        businessTitle: opts.businessTitle,
        cta: portalCta(),
      });
    case "subscription_upgraded":
      return buildSubscriptionUpgradedEmail({
        businessTitle: opts.businessTitle,
        cta: portalCta(),
      });
    default: {
      const _exhaustive: never = opts.event;
      throw new Error(`Unhandled portal notification event: ${_exhaustive}`);
    }
  }
}

export async function sendPortalInviteEmail(opts: {
  to: string;
  businessTitle: string;
  acceptUrl: string;
  inviterEmail?: string | null;
}): Promise<void> {
  try {
    const rendered = await buildPortalInviteEmail({
      businessTitle: opts.businessTitle,
      acceptUrl: opts.acceptUrl,
      inviterEmail: opts.inviterEmail,
    });
    await sendTransactionalEmail({
      from: portalFromAddress(),
      to: opts.to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      logLabel: "portal-invite",
    });
    return;
  } catch (err) {
    console.error("[portal-invite] MJML render failed; falling back to text", err);
  }

  const subject = `You're invited to manage ${opts.businessTitle} on WhereTo30A`;
  const inviter = opts.inviterEmail ? `\n\nInvited by: ${opts.inviterEmail}` : "";
  const text = `You've been invited to help manage ${opts.businessTitle} on WhereTo30A.${inviter}\n\nAccept the invite:\n${opts.acceptUrl}\n\nThis link expires in 7 days.`;

  await sendTransactionalEmail({
    from: portalFromAddress(),
    to: opts.to,
    subject,
    text,
    logLabel: "portal-invite",
  });
}

export async function sendPortalOwnerEmail(opts: {
  to: string;
  event: PortalNotificationEvent;
  businessTitle: string;
  adminNotes?: string | null;
  /** Absolute public listing URL when the listing is live. */
  listingUrl?: string | null;
  /** Prefills submit-changes CTA when the listing already exists. */
  businessSlug?: string | null;
}): Promise<void> {
  try {
    const rendered = await renderPortalMjmlEmail(opts);
    await sendTransactionalEmail({
      from: portalFromAddress(),
      to: opts.to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      logLabel: `portal-notification:${opts.event}`,
    });
    return;
  } catch (err) {
    console.error("[portal-notification] MJML render failed; falling back to text", opts.event, err);
  }

  const subject = SUBJECTS[opts.event]({ businessTitle: opts.businessTitle });
  const text = BODIES[opts.event]({
    businessTitle: opts.businessTitle,
    adminNotes: opts.adminNotes,
  });

  await sendTransactionalEmail({
    from: portalFromAddress(),
    to: opts.to,
    subject,
    text,
    logLabel: `portal-notification:${opts.event}`,
  });
}
