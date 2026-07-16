import {
  buildBusinessRequestReceivedEmail,
  buildListingLiveEmail,
  buildListingRemovedEmail,
  buildRequestRejectedEmail,
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
  /** Prefills submit-changes CTA for update/claim/removal rejects. */
  businessSlug?: string | null;
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
        subject: "Thanks for submitting your business to WhereTo30A!",
        text: [
          "Thanks for submitting your business to WhereTo30A!",
          "",
          "We've received your listing and our team will review it to make sure everything looks great before it's published. If we need any additional information, we'll reach out using the email address you provided.",
          "",
          "Once approved, your business will be live and discoverable by locals and visitors exploring everything 30A has to offer.",
          "",
          "Thank you for being part of the WhereTo30A community. We're excited to help more people discover your business.",
          "",
          "Warmly,",
          "The WhereTo30A Team",
          "Your Local Guide to All Things 30A Florida",
          "",
          "Questions? Email hello@whereto30a.com",
        ].join("\n"),
        logLabel: "free-onboard-notify:received",
      });
      return;
    }
  }

  if (opts.isRemoval) {
    if (opts.event === "approved") {
      try {
        const rendered = await buildListingRemovedEmail({
          businessTitle: title,
          adminNotes: opts.adminNotes,
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
        console.error("[free-onboard-notify] MJML removal render failed", err);
        await sendTransactionalEmail({
          from: listingFromAddress(),
          to: opts.to,
          subject: `${title} has been removed from WhereTo30A`,
          text: [
            "This email confirms that your business listing has been removed from WhereTo30A.",
            "",
            "Your listing is no longer visible on our website and will no longer appear in search results or directory pages.",
            "",
            "If this was done by mistake, or you'd like to add your business back in the future, you're always welcome to submit a new listing.",
            "",
            "Thank you for being part of the WhereTo30A community, and we wish you all the best.",
            "",
            "Warmly,",
            "The WhereTo30A Team",
            "Your Local Guide to All Things 30A Florida",
            "",
            "Questions? Email hello@whereto30a.com",
          ].join("\n"),
          logLabel: "free-onboard-notify:approved",
        });
        return;
      }
    }

    try {
      const rendered = await buildRequestRejectedEmail({
        businessTitle: title,
        kind: "removal",
        adminNotes: opts.adminNotes,
        businessSlug: opts.businessSlug,
      });
      await sendTransactionalEmail({
        from: listingFromAddress(),
        to: opts.to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        logLabel: "free-onboard-notify:rejected",
      });
      return;
    } catch (err) {
      console.error("[free-onboard-notify] MJML removal reject render failed", err);
    }

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
      ? `Your updates for ${title} are live on WhereTo30A`
      : `${title} is now live on WhereTo30A`;
    const linkBlock =
      links.length > 0
        ? `\n\nView ${links.length === 1 ? "your listing" : "your listings"}:\n${links.join("\n")}`
        : "";
    const text = [
      "Your business listing has been reviewed, approved, and is now live on WhereTo30A.",
      "",
      "Visitors can now discover your business while exploring everything 30A has to offer.",
      "",
      "Thank you for being part of the WhereTo30A community. We're excited to help more people discover your business.",
      linkBlock,
      "",
      "Warmly,",
      "The WhereTo30A Team",
      "Your Local Guide to All Things 30A Florida",
      "",
      "Questions? Email hello@whereto30a.com",
    ]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");

    await sendTransactionalEmail({
      from: listingFromAddress(),
      to: opts.to,
      subject,
      text,
      logLabel: "free-onboard-notify:approved",
    });
    return;
  }

  try {
    const rendered = await buildRequestRejectedEmail({
      businessTitle: title,
      kind: opts.isUpdate ? "update" : "listing",
      adminNotes: opts.adminNotes,
      businessSlug: opts.businessSlug,
    });
    await sendTransactionalEmail({
      from: listingFromAddress(),
      to: opts.to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      logLabel: "free-onboard-notify:rejected",
    });
    return;
  } catch (err) {
    console.error("[free-onboard-notify] MJML reject render failed", err);
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
