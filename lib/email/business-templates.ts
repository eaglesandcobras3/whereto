import { emailBrandAssetVars, emailSiteBase } from "@/lib/email/brand";
import {
  type BusinessEmailTemplateId,
  renderMjmlFile,
} from "@/lib/email/render-mjml";
import { escapeHtml } from "@/lib/email/escape";

export type RenderedBusinessEmail = {
  templateId: BusinessEmailTemplateId;
  subject: string;
  text: string;
  html: string;
};

type Cta = { url: string; label: string };

const RAW_KEYS = new Set(["ctaBlock", "adminNotesBlock", "linksBlock"]);

function ctaBlockMjml(cta?: Cta | null): string {
  if (!cta?.url) return "";
  return `<mj-button href="${escapeHtml(cta.url)}" align="center">${escapeHtml(cta.label)}</mj-button>`;
}

function adminNotesBlockMjml(adminNotes?: string | null): string {
  const notes = adminNotes?.trim();
  if (!notes) return "";
  return `<mj-text align="center" color="#5a6b6d" padding-top="8px" padding-bottom="4px"><strong>Note from our team:</strong> ${escapeHtml(notes)}</mj-text>`;
}

function linksBlockMjml(links: string[]): string {
  if (links.length === 0) return "";
  const items = links
    .map(
      (url) =>
        `<mj-text align="center" padding-bottom="6px"><a href="${escapeHtml(url)}" style="color:#57A0AF;text-decoration:underline;">${escapeHtml(url)}</a></mj-text>`,
    )
    .join("\n");
  const label =
    links.length === 1 ? "View your listing:" : "View your listings:";
  return `<mj-text align="center" font-weight="700" padding-top="8px" padding-bottom="8px">${label}</mj-text>\n${items}`;
}

async function finalize(
  templateId: BusinessEmailTemplateId,
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

/** Sent when we receive a business listing / update / claim / photo request. */
export async function buildBusinessRequestReceivedEmail(opts: {
  businessTitle: string;
  /** e.g. "listing", "update", "claim", "photo" */
  requestKind: string;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const kind = opts.requestKind.trim() || "request";
  const subject = `We received your ${kind} for ${title}`;
  const preview = `Our team will review ${title} and email you when it goes live.`;
  const text = [
    `Thanks for submitting ${title} on WhereTo30A.`,
    ``,
    `Our team will review your ${kind} and email you when your listing or updates go live.`,
    ``,
    `No action is needed from you right now.`,
    opts.cta ? `\n${opts.cta.label}:\n${opts.cta.url}` : "",
    ``,
    `Questions? Email hello@whereto30a.com`,
    `Instagram: https://www.instagram.com/whereto30a/`,
    `TikTok: https://www.tiktok.com/@whereto30a`,
    emailSiteBase(),
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return finalize("business-request-received", subject, text, {
    subject,
    preview,
    headline: "We received your request",
    businessTitle: title,
    requestKind: kind,
    ctaBlock: ctaBlockMjml(opts.cta),
  });
}

/** Sent when a business request is approved (new listing or claim). */
export async function buildBusinessRequestApprovedEmail(opts: {
  businessTitle: string;
  /** claim | listing */
  kind: "listing" | "claim";
  adminNotes?: string | null;
  cta?: Cta | null;
}): Promise<RenderedBusinessEmail> {
  const title = opts.businessTitle.trim() || "your business";
  const subject =
    opts.kind === "claim"
      ? `You're now managing ${title} on WhereTo30A`
      : `${title} was approved on WhereTo30A`;
  const preview =
    opts.kind === "claim"
      ? `Your claim for ${title} was approved.`
      : `${title} has been approved and is ready on WhereTo30A.`;
  const approvalDetail =
    opts.kind === "claim"
      ? "You can sign in to the Business Portal to manage your listing."
      : "Your listing is approved. Visitors can find it on WhereTo30A — keep details current from your Business Portal.";
  const headline = opts.kind === "claim" ? "You're all set!" : "You're approved!";

  const textParts = [
    opts.kind === "claim"
      ? `Your claim for ${title} was approved. Sign in to your Business Portal to manage your listing.`
      : `Good news. ${title} has been approved on WhereTo30A. Visit your Business Portal to keep your listing up to date.`,
  ];
  if (opts.adminNotes?.trim()) {
    textParts.push(``, `Note from our team: ${opts.adminNotes.trim()}`);
  }
  if (opts.cta) {
    textParts.push(``, `${opts.cta.label}:`, opts.cta.url);
  }
  textParts.push(
    ``,
    `Questions? Email hello@whereto30a.com`,
    `Instagram: https://www.instagram.com/whereto30a/`,
    `TikTok: https://www.tiktok.com/@whereto30a`,
    emailSiteBase(),
  );

  return finalize("business-request-approved", subject, textParts.join("\n"), {
    subject,
    preview,
    headline,
    businessTitle: title,
    approvalDetail,
    adminNotesBlock: adminNotesBlockMjml(opts.adminNotes),
    ctaBlock: ctaBlockMjml(opts.cta),
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
  let lead: string;
  let liveDetail: string;
  let preview: string;

  if (opts.variant === "update") {
    subject = `Your updates for ${title} are live on WhereTo30A`;
    headline = "Your updates are live!";
    lead = `The changes you submitted for ${title} are now on WhereTo30A.`;
    liveDetail = "Thanks for keeping your listing current for visitors planning a trip to 30A.";
    preview = `Your updates for ${title} are live.`;
  } else if (opts.variant === "photo") {
    subject = `Your photo for ${title} is live on WhereTo30A`;
    headline = "Your photo is live!";
    lead = `Your photo for ${title} was approved and is now on your listing.`;
    liveDetail = "Visitors will see it the next time they open your page.";
    preview = `Your photo for ${title} is on your listing.`;
  } else {
    subject = `${title} is now live on WhereTo30A`;
    headline = "You're all set!";
    lead = `${title} is now live on WhereTo30A.`;
    liveDetail =
      links.length > 1
        ? `This confirmation covers your whole submission (${links.length} locations).`
        : "Share your page anytime — and update details from the Business Portal when something changes.";
    preview = `${title} is live on WhereTo30A.`;
  }

  const textParts = [lead, ``, liveDetail];
  if (links.length) {
    textParts.push(
      ``,
      links.length === 1 ? "View your listing:" : "View your listings:",
      ...links,
    );
  }
  if (opts.cta) {
    textParts.push(``, `${opts.cta.label}:`, opts.cta.url);
  }
  textParts.push(
    ``,
    `Questions? Email hello@whereto30a.com`,
    `Instagram: https://www.instagram.com/whereto30a/`,
    `TikTok: https://www.tiktok.com/@whereto30a`,
    emailSiteBase(),
  );

  return finalize("listing-live", subject, textParts.join("\n"), {
    subject,
    preview,
    headline,
    lead,
    liveDetail,
    linksBlock: linksBlockMjml(links),
    ctaBlock: ctaBlockMjml(opts.cta),
  });
}
