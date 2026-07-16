/**
 * Compile the business MJML templates to HTML for local preview.
 *
 *   npx tsx scripts/preview-email-templates.ts
 *
 * Writes lib/email/.previews/*.html — open in a browser (or paste into Litmus/Email on Acid).
 * Supabase Auth HTML (paste into Dashboard) lives at lib/email/templates/supabase/*.html
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAdminAlertEmail,
  buildBusinessRequestApprovedEmail,
  buildBusinessRequestReceivedEmail,
  buildListingLiveEmail,
  buildListingRemovedEmail,
  buildPaymentFailedEmail,
  buildPaymentSuccessEmail,
  buildPortalInviteEmail,
  buildRequestRejectedEmail,
  buildReviewNeedsChangesEmail,
  buildSubscriptionUpgradedEmail,
  portalCta,
} from "../lib/email/business-templates";

async function main() {
  // Absolute asset URLs in the HTML should match production for visual QA.
  process.env.NEXT_PUBLIC_SITE_URL ||= "https://whereto30a.com";

  const dir = join(process.cwd(), "lib/email/.previews");
  mkdirSync(dir, { recursive: true });

  const received = await buildBusinessRequestReceivedEmail({
    businessTitle: "Sample Beach Cafe",
    requestKind: "listing",
  });
  const approved = await buildBusinessRequestApprovedEmail({
    businessTitle: "Sample Beach Cafe",
    kind: "listing",
    listingUrl: "https://whereto30a.com/business/sample-beach-cafe",
  });
  const live = await buildListingLiveEmail({
    businessTitle: "Sample Beach Cafe",
    variant: "listing",
    listingUrls: ["https://whereto30a.com/business/sample-beach-cafe"],
  });
  const updateLive = await buildListingLiveEmail({
    businessTitle: "Sample Beach Cafe",
    variant: "update",
    listingUrls: ["https://whereto30a.com/business/sample-beach-cafe"],
  });
  const removed = await buildListingRemovedEmail({
    businessTitle: "Sample Beach Cafe",
  });
  const invite = await buildPortalInviteEmail({
    businessTitle: "Sample Beach Cafe",
    acceptUrl: "https://whereto30a.com/portal/invites/accept?token=preview",
    inviterEmail: "owner@example.com",
  });
  const rejected = await buildRequestRejectedEmail({
    businessTitle: "Sample Beach Cafe",
    kind: "listing",
    adminNotes: "Please add a clearer address and hours.",
    businessSlug: "sample-beach-cafe",
  });
  const needsChanges = await buildReviewNeedsChangesEmail({
    businessTitle: "Sample Beach Cafe",
    adminNotes: "Update the photo and short description.",
    businessSlug: "sample-beach-cafe",
  });
  const paymentOk = await buildPaymentSuccessEmail({
    businessTitle: "Sample Beach Cafe",
    cta: portalCta(),
  });
  const paymentFail = await buildPaymentFailedEmail({
    businessTitle: "Sample Beach Cafe",
    cta: portalCta(),
  });
  const upgraded = await buildSubscriptionUpgradedEmail({
    businessTitle: "Sample Beach Cafe",
    cta: portalCta(),
  });
  const admin = await buildAdminAlertEmail({
    subject: "[WhereTo30A] Preview admin alert",
    headline: "Admin alert preview",
    lead: "Sample ops notification with detail rows.",
    detailsHtml:
      "<p><strong>Submitter:</strong> Jane &lt;jane@example.com&gt;</p><p><strong>Business:</strong> Sample Beach Cafe</p>",
    text: "Admin alert preview\n\nSubmitter: Jane <jane@example.com>\nBusiness: Sample Beach Cafe",
    cta: { url: "https://whereto30a.com/admin/review", label: "Open review queue" },
  });

  const files: Array<[string, string]> = [
    ["business-request-received.html", received.html],
    ["business-request-approved.html", approved.html],
    ["listing-live.html", live.html],
    ["listing-updates-live.html", updateLive.html],
    ["listing-removed.html", removed.html],
    ["portal-invite.html", invite.html],
    ["request-rejected.html", rejected.html],
    ["review-needs-changes.html", needsChanges.html],
    ["payment-success.html", paymentOk.html],
    ["payment-failed.html", paymentFail.html],
    ["subscription-upgraded.html", upgraded.html],
    ["admin-alert.html", admin.html],
  ];

  for (const [name, html] of files) {
    // Point images at local /public so previews work before deploy.
    const localHtml = html.replaceAll(
      "https://whereto30a.com/email/",
      "../../../public/email/",
    );
    const path = join(dir, name);
    writeFileSync(path, localHtml);
    console.log("wrote", path);
  }

  console.log(
    "Supabase Auth templates (Dashboard paste): lib/email/templates/supabase/*.html",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
