import { emailBrandAssetVars, emailSiteBase } from "@/lib/email/brand";
import {
  type EmailTemplateId,
  renderMjmlFile,
} from "@/lib/email/render-mjml";
import { escapeHtml } from "@/lib/email/escape";

export type RenderedBusinessEmail = {
  templateId: EmailTemplateId;
  subject: string;
  text: string;
  html: string;
};

type Cta = { url: string; label: string };

const RAW_KEYS = new Set([
  "ctaBlock",
  "adminNotesBlock",
  "linksBlock",
  "bodyBlocks",
  "detailsHtml",
]);

const SIGN_OFF_LINES = [
  `Warmly,`,
  `The WhereTo30A Team`,
  `Your Local Guide to All Things 30A Florida`,
] as const;

function ctaBlockMjml(cta?: Cta | null): string {
  if (!cta?.url) return "";
  return `<mj-button href="${escapeHtml(cta.url)}" align="center">${escapeHtml(cta.label)}</mj-button>`;
}

function adminNotesBlockMjml(adminNotes?: string | null): string {
  const notes = adminNotes?.trim();
  if (!notes) return "";
  return `<mj-text align="left" color="#5a6b6d" padding-top="8px" padding-bottom="4px" css-class="email-muted"><strong>Note from our team:</strong> ${escapeHtml(notes)}</mj-text>`;
}

function linksBlockMjml(links: string[]): string {
  if (links.length === 0) return "";
  const items = links
    .map(
      (url) =>
        `<mj-text align="left" padding-bottom="6px"><a href="${escapeHtml(url)}" style="color:#57A0AF;text-decoration:underline;">${escapeHtml(url)}</a></mj-text>`,
    )
    .join("\n");
  const label =
    links.length === 1 ? "View your listing:" : "View your listings:";
  return `<mj-text align="left" font-weight="700" padding-top="8px" padding-bottom="8px">${label}</mj-text>\n${items}`;
}

function bodyBlocksMjml(paragraphs: string[]): string {
  return paragraphs
    .map((paragraph, index) => {
      const color = index === 0 ? undefined : ' color="#5a6b6d"';
      const cssClass = index === 0 ? "" : ' css-class="email-muted"';
      return `<mj-text align="left"${color ?? ""} padding-bottom="12px"${cssClass}>${escapeHtml(paragraph)}</mj-text>`;
    })
    .join("\n");
}

function footerTextLines(cta?: Cta | null): string[] {
  const lines: string[] = [];
  if (cta) {
    lines.push(``, `${cta.label}:`, cta.url);
  }
  lines.push(
    ``,
    ...SIGN_OFF_LINES,
    ``,
    `Questions? Email hello@whereto30a.com`,
    `Instagram: https://www.instagram.com/whereto30a/`,
    `TikTok: https://www.tiktok.com/@whereto30a`,
    emailSiteBase(),
  );
  return lines;
}

function joinEmailText(parts: string[]): string {
  return parts.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Public form for listing / update / claim requests (portal not public yet). */
export function submitChangesCta(businessSlug?: string | null): Cta {
  const base = `${emailSiteBase()}/list-your-business`;
  const slug = businessSlug?.trim();
  return {
    url: slug ? `${base}?business=${encodeURIComponent(slug)}` : base,
    label: "Submit changes on WhereTo30A",
  };
}

/** CTA to open a published listing page. */
export function viewListingCta(listingUrl: string): Cta {
  return {
    url: listingUrl.trim(),
    label: "View your listing",
  };
}

/** CTA for Local Partner / paid portal access. */
export function portalCta(): Cta {
  return {
    url: `${emailSiteBase()}/portal`,
    label: "Open Business Portal",
  };
}

async function finalize(
  templateId: EmailTemplateId,
  subject: string,
  text: string,
  vars: Record<string, string>,
): Promise<RenderedBusinessEmail> {
  const html = await renderMjmlFile(
    templateId,
    { ...emailBrandAssetVars(), ...vars },
    { rawKeys: RAW_KEYS },
  );
  return { templateId, subject, text, html };
}

async function finalizeSimpleMessage(opts: {
  templateId: EmailTemplateId;
  subject: string;
  preview: string;
  headline: string;
  lead: string;
  detail: string;
  text: string;
  adminNotes?: string | null;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  return finalize(opts.templateId, opts.subject, opts.text, {
    subject: opts.subject,
    preview: opts.preview,
    headline: opts.headline,
    lead: opts.lead,
    detail: opts.detail,
    adminNotesBlock: adminNotesBlockMjml(opts.adminNotes),
    ctaBlock: ctaBlockMjml(opts.cta),
  });
}

/** Sent when we receive a business listing / update / claim / photo request. */
export async function buildBusinessRequestReceivedEmail(opts: {
  businessTitle: string;
  /** e.g. "listing", "update", "claim", "photo" */
  requestKind: string;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const kind = opts.requestKind.trim() || "request";
  const isListingOrUpdate =
    kind === "listing" ||
    kind === "update" ||
    kind.startsWith("listing") ||
    kind.startsWith("update");

  if (isListingOrUpdate) {
    const subject = "Thanks for submitting your business to WhereTo30A!";
    const preview =
      "We've received your listing and our team will review it before it's published.";
    const paragraphs = [
      "We've received your listing and our team will review it to make sure everything looks great before it's published. If we need any additional information, we'll reach out using the email address you provided.",
      "Once approved, your business will be live and discoverable by locals and visitors exploring everything 30A has to offer.",
      "Thank you for being part of the WhereTo30A community. We're excited to help more people discover your business.",
    ];
    const text = joinEmailText([
      "Thanks for submitting your business to WhereTo30A!",
      ``,
      ...paragraphs,
      ...footerTextLines(opts.cta),
    ]);

    return finalize("business-request-received", subject, text, {
      subject,
      preview,
      headline: "Thanks for submitting!",
      bodyBlocks: bodyBlocksMjml(paragraphs),
      ctaBlock: ctaBlockMjml(opts.cta),
    });
  }

  const subject = `We received your ${kind} for ${title}`;
  const preview = `Our team will review ${title} and email you when it goes live.`;
  const paragraphs = [
    `Thanks for submitting ${title} on WhereTo30A.`,
    `Our team will review your ${kind} and email you when your listing or updates go live.`,
  ];
  const text = joinEmailText([...paragraphs, ...footerTextLines(opts.cta)]);

  return finalize("business-request-received", subject, text, {
    subject,
    preview,
    headline: "We received your request",
    bodyBlocks: bodyBlocksMjml(paragraphs),
    ctaBlock: ctaBlockMjml(opts.cta),
  });
}

/** Sent when a business request is approved (new listing or claim). */
export async function buildBusinessRequestApprovedEmail(opts: {
  businessTitle: string;
  /** claim | listing */
  kind: "listing" | "claim";
  adminNotes?: string | null;
  /** Absolute listing URL; when set, shown as a text link (same as listing-live). */
  listingUrl?: string | null;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const listingUrl = opts.listingUrl?.trim() || "";
  const links = listingUrl ? [listingUrl] : [];
  // Listing URL uses a text link (linksBlock), not a button — same as listing-updates-live.
  const cta =
    opts.cta ??
    (listingUrl ? null : opts.kind === "listing" ? null : submitChangesCta());

  if (opts.kind === "listing") {
    const subject = `${title} was approved on WhereTo30A`;
    const preview = `${title} has been reviewed, approved, and is now live on WhereTo30A.`;
    const paragraphs = [
      "Your business listing has been reviewed, approved, and is now live on WhereTo30A.",
      "Visitors can now discover your business while exploring everything 30A has to offer.",
      "Thank you for being part of the WhereTo30A community. We're excited to help more people discover your business.",
    ];
    const textParts = [...paragraphs];
    if (opts.adminNotes?.trim()) {
      textParts.push(``, `Note from our team: ${opts.adminNotes.trim()}`);
    }
    if (links.length) {
      textParts.push(``, "View your listing:", ...links);
    }
    textParts.push(...footerTextLines(cta));

    return finalize("business-request-approved", subject, joinEmailText(textParts), {
      subject,
      preview,
      headline: "Great news!",
      bodyBlocks: bodyBlocksMjml(paragraphs),
      adminNotesBlock: adminNotesBlockMjml(opts.adminNotes),
      linksBlock: linksBlockMjml(links),
      ctaBlock: ctaBlockMjml(cta),
    });
  }

  const subject = `You're now managing ${title} on WhereTo30A`;
  const preview = `Your claim for ${title} was approved.`;
  const paragraphs = [
    `Your claim for ${title} was approved.`,
    "You can submit listing changes anytime on WhereTo30A.",
  ];
  const textParts = [...paragraphs];
  if (opts.adminNotes?.trim()) {
    textParts.push(``, `Note from our team: ${opts.adminNotes.trim()}`);
  }
  if (links.length) {
    textParts.push(``, "View your listing:", ...links);
  }
  textParts.push(...footerTextLines(cta));

  return finalize("business-request-approved", subject, joinEmailText(textParts), {
    subject,
    preview,
    headline: "You're all set!",
    bodyBlocks: bodyBlocksMjml(paragraphs),
    adminNotesBlock: adminNotesBlockMjml(opts.adminNotes),
    linksBlock: linksBlockMjml(links),
    ctaBlock: ctaBlockMjml(cta),
  });
}

/** Sent when a listing or updates go live. */
export async function buildListingLiveEmail(opts: {
  businessTitle: string;
  /** new listing vs edits/photos */
  variant: "listing" | "update" | "photo";
  listingUrls?: string[];
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const links = (opts.listingUrls ?? []).map((u) => u.trim()).filter(Boolean);

  let subject: string;
  let headline: string;
  let preview: string;
  let paragraphs: string[];

  if (opts.variant === "photo") {
    subject = `Your photo for ${title} is live on WhereTo30A`;
    headline = "Your photo is live!";
    preview = `Your photo for ${title} is on your listing.`;
    paragraphs = [
      `Your photo for ${title} was approved and is now on your listing.`,
      "Visitors will see it the next time they open your page.",
    ];
  } else {
    subject =
      opts.variant === "update"
        ? `Your updates for ${title} are live on WhereTo30A`
        : `${title} is now live on WhereTo30A`;
    headline = "Great news!";
    preview =
      "Your business listing has been reviewed, approved, and is now live on WhereTo30A.";
    paragraphs = [
      "Your business listing has been reviewed, approved, and is now live on WhereTo30A.",
      "Visitors can now discover your business while exploring everything 30A has to offer.",
      "Thank you for being part of the WhereTo30A community. We're excited to help more people discover your business.",
    ];
  }

  const textParts = [...paragraphs];
  if (links.length) {
    textParts.push(
      ``,
      links.length === 1 ? "View your listing:" : "View your listings:",
      ...links,
    );
  }
  textParts.push(...footerTextLines(opts.cta));

  return finalize("listing-live", subject, joinEmailText(textParts), {
    subject,
    preview,
    headline,
    bodyBlocks: bodyBlocksMjml(paragraphs),
    linksBlock: linksBlockMjml(links),
    ctaBlock: ctaBlockMjml(opts.cta),
  });
}

/** Sent when a free-intake removal request is approved and the listing is archived. */
export async function buildListingRemovedEmail(opts: {
  businessTitle: string;
  adminNotes?: string | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const subject = `${title} has been removed from WhereTo30A`;
  const headline = "Listing removed";
  const preview = "This email confirms that your business listing has been removed from WhereTo30A.";
  const paragraphs = [
    "This email confirms that your business listing has been removed from WhereTo30A.",
    "Your listing is no longer visible on our website and will no longer appear in search results or directory pages.",
    "If this was done by mistake, or you'd like to add your business back in the future, you're always welcome to submit a new listing.",
    "Thank you for being part of the WhereTo30A community, and we wish you all the best.",
  ];

  const textParts = [...paragraphs];
  if (opts.adminNotes?.trim()) {
    textParts.push(``, `Note from our team: ${opts.adminNotes.trim()}`);
  }
  textParts.push(...footerTextLines());

  return finalize("listing-removed", subject, joinEmailText(textParts), {
    subject,
    preview,
    headline,
    bodyBlocks: bodyBlocksMjml(paragraphs),
    adminNotesBlock: adminNotesBlockMjml(opts.adminNotes),
  });
}

/** Portal team invite. */
export async function buildPortalInviteEmail(opts: {
  businessTitle: string;
  acceptUrl: string;
  inviterEmail?: string | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "a business";
  const subject = `You're invited to manage ${title} on WhereTo30A`;
  const inviter = opts.inviterEmail?.trim();
  const lead = inviter
    ? `You've been invited by ${inviter} to help manage ${title} on WhereTo30A.`
    : `You've been invited to help manage ${title} on WhereTo30A.`;
  const detail = "This invite link expires in 7 days.";
  const cta = { url: opts.acceptUrl, label: "Accept invite" };
  const text = [lead, ``, detail, ...footerTextLines(cta)].join("\n");

  return finalizeSimpleMessage({
    templateId: "portal-invite",
    subject,
    preview: `Accept your invite to manage ${title}.`,
    headline: "You're invited",
    lead,
    detail,
    text,
    cta,
  });
}

/** Claim / listing / edit / photo / free-intake rejection. */
export async function buildRequestRejectedEmail(opts: {
  businessTitle: string;
  kind: "claim" | "listing" | "edit" | "photo" | "removal" | "update";
  adminNotes?: string | null;
  /** Prefills `/list-your-business?business=` when the listing already exists. */
  businessSlug?: string | null;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";

  const copy: Record<
    typeof opts.kind,
    { subject: string; headline: string; lead: string; detail: string }
  > = {
    claim: {
      subject: `Update on your claim for ${title}`,
      headline: "Claim update",
      lead: `We could not approve your claim for ${title} at this time.`,
      detail: "If you still manage this business, submit again on WhereTo30A with more detail and we can take another look.",
    },
    listing: {
      subject: `Update on your listing submission`,
      headline: "Listing update",
      lead: `We couldn't publish ${title} as submitted.`,
      detail: "You can submit updates again on WhereTo30A when you are ready.",
    },
    edit: {
      subject: `Update on your edit request for ${title}`,
      headline: "Edit update",
      lead: `We could not apply your proposed edits for ${title}.`,
      detail: "Review the note below (if any), then submit changes again on the website when you are ready.",
    },
    photo: {
      subject: `Update on your photo for ${title}`,
      headline: "Photo update",
      lead: `We could not use the photo you submitted for ${title}.`,
      detail: "Submit another photo on WhereTo30A when you are ready.",
    },
    removal: {
      subject: `Update on your removal request for ${title}`,
      headline: "Removal update",
      lead: `We could not remove ${title} from WhereTo30A at this time.`,
      detail: "You can submit another removal request on the website, or reply if you need help.",
    },
    update: {
      subject: `Update on your request for ${title}`,
      headline: "Request update",
      lead: `We could not apply your requested updates for ${title} at this time.`,
      detail: "Submit your changes again on WhereTo30A when you are ready.",
    },
  };

  const c = copy[opts.kind];
  const cta = opts.cta === undefined ? submitChangesCta(opts.businessSlug) : opts.cta;
  const textParts = [c.lead];
  if (opts.adminNotes?.trim()) {
    textParts.push(``, `Note from our team: ${opts.adminNotes.trim()}`);
  }
  textParts.push(``, c.detail, ...footerTextLines(cta));

  return finalizeSimpleMessage({
    templateId: "request-rejected",
    subject: c.subject,
    preview: c.lead,
    headline: c.headline,
    lead: c.lead,
    detail: c.detail,
    text: textParts.join("\n"),
    adminNotes: opts.adminNotes,
    cta,
  });
}

export async function buildReviewNeedsChangesEmail(opts: {
  businessTitle: string;
  adminNotes?: string | null;
  /** Prefills `/list-your-business?business=` when the listing already exists. */
  businessSlug?: string | null;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const subject = `Changes requested for ${title}`;
  const lead = `Our team requested changes to your submission for ${title}.`;
  const detail =
    "Submit your updates on WhereTo30A when you are ready, and we will take another look.";
  const cta = opts.cta === undefined ? submitChangesCta(opts.businessSlug) : opts.cta;
  const textParts = [lead];
  if (opts.adminNotes?.trim()) {
    textParts.push(``, `Note from our team: ${opts.adminNotes.trim()}`);
  }
  textParts.push(``, detail, ...footerTextLines(cta));

  return finalizeSimpleMessage({
    templateId: "review-needs-changes",
    subject,
    preview: lead,
    headline: "Changes requested",
    lead,
    detail,
    text: textParts.join("\n"),
    adminNotes: opts.adminNotes,
    cta,
  });
}

export async function buildPaymentSuccessEmail(opts: {
  businessTitle: string;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const subject = `Local Partner plan active for ${title}`;
  const lead = `Your Local Partner plan for ${title} is now active.`;
  const detail =
    "Sign in to the Business Portal to add hours, social links, more photos, and a full description.";
  const text = [lead, ``, detail, ...footerTextLines(opts.cta)].join("\n");

  return finalizeSimpleMessage({
    templateId: "payment-success",
    subject,
    preview: lead,
    headline: "You're a Local Partner",
    lead,
    detail,
    text,
    cta: opts.cta,
  });
}

export async function buildPaymentFailedEmail(opts: {
  businessTitle: string;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const subject = `Action needed: payment failed for ${title}`;
  const lead = `We couldn't process your latest payment for ${title}.`;
  const detail =
    "Update your payment method in the Business Portal billing section to keep Local Partner benefits.";
  const text = [lead, ``, detail, ...footerTextLines(opts.cta)].join("\n");

  return finalizeSimpleMessage({
    templateId: "payment-failed",
    subject,
    preview: lead,
    headline: "Payment needs attention",
    lead,
    detail,
    text,
    cta: opts.cta,
  });
}

export async function buildSubscriptionUpgradedEmail(opts: {
  businessTitle: string;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const subject = `Your plan for ${title} was upgraded`;
  const lead = `Your plan for ${title} was upgraded.`;
  const detail =
    "Sign in to the Business Portal to use your new features.";
  const text = [lead, ``, detail, ...footerTextLines(opts.cta)].join("\n");

  return finalizeSimpleMessage({
    templateId: "subscription-upgraded",
    subject,
    preview: lead,
    headline: "Plan upgraded",
    lead,
    detail,
    text,
    cta: opts.cta,
  });
}

/**
 * Wrap operator/admin alert content in branded chrome.
 * `detailsHtml` should be inner HTML only (tables, paragraphs) — escaped by the caller.
 */
export async function buildAdminAlertEmail(opts: {
  subject: string;
  headline: string;
  lead: string;
  detailsHtml: string;
  text: string;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  return finalize("admin-alert", opts.subject, opts.text, {
    subject: opts.subject,
    preview: opts.lead,
    headline: opts.headline,
    lead: opts.lead,
    detailsHtml: opts.detailsHtml.trim(),
    ctaBlock: ctaBlockMjml(opts.cta),
  });
}
