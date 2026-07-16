/**
 * Compile the business MJML templates to HTML for local preview.
 *
 *   npx tsx scripts/preview-email-templates.ts
 *
 * Writes lib/email/.previews/*.html — open in a browser (or paste into Litmus/Email on Acid).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildBusinessRequestApprovedEmail,
  buildBusinessRequestReceivedEmail,
  buildListingLiveEmail,
} from "../lib/email/business-templates";

async function main() {
  // Absolute asset URLs in the HTML should match production for visual QA.
  process.env.NEXT_PUBLIC_SITE_URL ||= "https://whereto30a.com";

  const dir = join(process.cwd(), "lib/email/.previews");
  mkdirSync(dir, { recursive: true });

  const received = await buildBusinessRequestReceivedEmail({
    businessTitle: "Sample Beach Cafe",
    requestKind: "listing",
    cta: { url: "https://whereto30a.com/portal", label: "Open Business Portal" },
  });
  const approved = await buildBusinessRequestApprovedEmail({
    businessTitle: "Sample Beach Cafe",
    kind: "listing",
    cta: { url: "https://whereto30a.com/portal", label: "Open Business Portal" },
  });
  const live = await buildListingLiveEmail({
    businessTitle: "Sample Beach Cafe",
    variant: "listing",
    listingUrls: ["https://whereto30a.com/business/sample-beach-cafe"],
    cta: { url: "https://whereto30a.com/portal", label: "Open Business Portal" },
  });
  const updateLive = await buildListingLiveEmail({
    businessTitle: "Sample Beach Cafe",
    variant: "update",
    listingUrls: ["https://whereto30a.com/business/sample-beach-cafe"],
  });

  const files: Array<[string, string]> = [
    ["business-request-received.html", received.html],
    ["business-request-approved.html", approved.html],
    ["listing-live.html", live.html],
    ["listing-updates-live.html", updateLive.html],
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
