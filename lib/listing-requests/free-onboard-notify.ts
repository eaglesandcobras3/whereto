import { Resend } from "resend";
import { OUTBOUND_CONTACT_FROM_DEFAULT } from "@/lib/email/outbound-defaults";
import { getSiteUrl } from "@/lib/site-url";

function fromAddress(): string {
  const raw =
    process.env.LISTING_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.PORTAL_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    OUTBOUND_CONTACT_FROM_DEFAULT;
  return raw.includes("<") ? raw : `WhereTo30A <${raw}>`;
}

export type FreeOnboardSubmitterEvent = "approved" | "rejected";

/**
 * Notify the free intake submitter when their request is decided.
 * Uses live listing URLs (no Business Portal — free path has no account).
 */
export async function sendFreeOnboardSubmitterEmail(opts: {
  to: string;
  event: FreeOnboardSubmitterEvent;
  businessTitle: string;
  listingPaths?: string[];
  adminNotes?: string | null;
  isUpdate?: boolean;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.error("[free-onboard-notify] Missing RESEND_API_KEY");
    return;
  }

  const base = getSiteUrl().replace(/\/$/, "");
  const links = (opts.listingPaths ?? [])
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith("http") ? p : `${base}/business/${encodeURIComponent(p.replace(/^\/business\//, ""))}`));

  const title = opts.businessTitle.trim() || "your business";
  let subject: string;
  let text: string;

  if (opts.event === "approved") {
    subject = opts.isUpdate
      ? `Your update for ${title} is live on WhereTo30A`
      : `${title} is now live on WhereTo30A`;
    const linkBlock =
      links.length > 0
        ? `\n\nView ${links.length === 1 ? "your listing" : "your listings"}:\n${links.join("\n")}`
        : "";
    text = opts.isUpdate
      ? `Good news — your requested updates for ${title} are live on WhereTo30A.${linkBlock}\n\nQuestions? Email hello@whereto30a.com`
      : `Good news — ${title} is now live on WhereTo30A.${linkBlock}\n\nQuestions? Email hello@whereto30a.com`;
  } else {
    subject = opts.isUpdate
      ? `Update on your request for ${title}`
      : `Update on your listing request for ${title}`;
    text = opts.isUpdate
      ? `We could not apply your requested updates for ${title} at this time.`
      : `We could not publish ${title} as submitted at this time.`;
    if (opts.adminNotes) {
      text += `\n\nNote from our team: ${opts.adminNotes}`;
    }
    text += `\n\nQuestions? Email hello@whereto30a.com`;
  }

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [opts.to],
    subject,
    text,
  });

  if (error) {
    console.error("[free-onboard-notify]", opts.event, error);
  }
}
