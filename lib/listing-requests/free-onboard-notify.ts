import {
  buildBusinessRequestReceivedEmail,
  buildListingLiveEmail,
} from "@/lib/email/business-templates";
import { listingFromAddress, sendTransactionalEmail } from "@/lib/email/send";
import { getSiteUrl } from "@/lib/site-url";

export type FreeOnboardSubmitterEvent = "received" | "approved" | "rejected";

function absoluteListingUrls(listingPaths?: string[]): string[] {
  const base = getSiteUrl().replace(/\/$/, "");
  return (listingPaths ?? [])
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) =>
      p.startsWith("http")
        ? p
        : `${base}/business/${encodeURIComponent(p.replace(/^\/business\//, ""))}`,
    );
}

/**
 * Notify the free intake submitter (no Business Portal account).
 * - received: request queued for review
 * - approved / rejected: decision on the intake
 */
export async function sendFreeOnboardSubmitterEmail(opts: {
  to: string;
  event: FreeOnboardSubmitterEvent;
  businessTitle: string;
  listingPaths?: string[];
  adminNotes?: string | null;
  isUpdate?: boolean;
  isRemoval?: boolean;
}): Promise<void> {
  const title = opts.businessTitle.trim() || "your business";
  const links = absoluteListingUrls(opts.listingPaths);

  if (opts.event === "received") {
    try {
      const rendered = await buildBusinessRequestReceivedEmail({
        businessTitle: title,
        requestKind: opts.isRemoval ? "removal request" : opts.isUpdate ? "update" : "listing",
      });
      await sendTransactionalEmail({
        from: listingFromAddress(),
        to: opts.to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        logLabel: "free-onboard-notify:received",
      });
      return;
    } catch (err) {
      console.error("[free-onboard-notify] MJML received render failed", err);
      await sendTransactionalEmail({
        from: listingFromAddress(),
        to: opts.to,
        subject: `We received your ${opts.isUpdate ? "update" : "listing"} for ${title}`,
        text: `Thanks for submitting ${title} on WhereTo30A.\n\nOur team will review your request and email you when your listing or updates go live.\n\nQuestions? Email hello@whereto30a.com`,
        logLabel: "free-onboard-notify:received",
      });
      return;
    }
  }

  if (opts.isRemoval) {
    if (opts.event === "approved") {
      await sendTransactionalEmail({
        from: listingFromAddress(),
        to: opts.to,
        subject: `${title} has been removed from WhereTo30A`,
        text: `We've removed ${title} from WhereTo30A as requested.\n\nQuestions? Email hello@whereto30a.com`,
        logLabel: "free-onboard-notify:approved",
      });
    } else {
      let text = `We could not remove ${title} from WhereTo30A at this time.`;
      if (opts.adminNotes) {
        text += `\n\nNote from our team: ${opts.adminNotes}`;
      }
      text += `\n\nQuestions? Email hello@whereto30a.com`;
      await sendTransactionalEmail({
        from: listingFromAddress(),
        to: opts.to,
        subject: `Update on your removal request for ${title}`,
        text,
        logLabel: "free-onboard-notify:rejected",
      });
    }
    return;
  }

  if (opts.event === "approved") {
    try {
      const rendered = await buildListingLiveEmail({
        businessTitle: title,
        variant: opts.isUpdate ? "update" : "listing",
        listingUrls: links,
      });
      await sendTransactionalEmail({
        from: listingFromAddress(),
        to: opts.to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        logLabel: "free-onboard-notify:approved",
      });
      return;
    } catch (err) {
      console.error("[free-onboard-notify] MJML approved render failed", err);
    }

    const subject = opts.isUpdate
      ? `Your update for ${title} is live on WhereTo30A`
      : `${title} is now live on WhereTo30A`;
    const linkBlock =
      links.length > 0
        ? `\n\nView ${links.length === 1 ? "your listing" : "your listings"}:\n${links.join("\n")}`
        : "";
    const text = opts.isUpdate
      ? `Good news — your requested updates for ${title} are live on WhereTo30A.${linkBlock}\n\nQuestions? Email hello@whereto30a.com`
      : `Good news — ${title} is now live on WhereTo30A.${linkBlock}\n\nThis is one confirmation for your whole submission${links.length > 1 ? ` (${links.length} locations)` : ""}.\n\nQuestions? Email hello@whereto30a.com`;

    await sendTransactionalEmail({
      from: listingFromAddress(),
      to: opts.to,
      subject,
      text,
      logLabel: "free-onboard-notify:approved",
    });
    return;
  }

  const subject = opts.isUpdate
    ? `Update on your request for ${title}`
    : `Update on your listing request for ${title}`;
  let text = opts.isUpdate
    ? `We could not apply your requested updates for ${title} at this time.`
    : `We could not publish ${title} as submitted at this time.`;
  if (opts.adminNotes) {
    text += `\n\nNote from our team: ${opts.adminNotes}`;
  }
  text += `\n\nQuestions? Email hello@whereto30a.com`;

  await sendTransactionalEmail({
    from: listingFromAddress(),
    to: opts.to,
    subject,
    text,
    logLabel: "free-onboard-notify:rejected",
  });
}
