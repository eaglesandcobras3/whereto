import { describe, expect, it } from "vitest";

import {
  buildAdminAlertEmail,
  buildBusinessRequestApprovedEmail,
  buildBusinessRequestReceivedEmail,
  buildListingLiveEmail,
  buildListingRemovedEmail,
  buildPaymentSuccessEmail,
  buildPortalInviteEmail,
  buildRequestRejectedEmail,
  buildReviewNeedsChangesEmail,
  portalCta,
} from "@/lib/email/business-templates";
import { escapeHtml } from "@/lib/email/escape";
import {
  expandMjmlIncludes,
  interpolateTemplate,
} from "@/lib/email/render-mjml";
import { join } from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

describe("escapeHtml / interpolateTemplate", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml(`<b>"A&B"</b>`)).toBe("&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;");
  });

  it("escapes interpolated values by default", () => {
    expect(interpolateTemplate("Hello {{name}}", { name: "<b>Acme</b>" })).toBe(
      "Hello &lt;b&gt;Acme&lt;/b&gt;",
    );
  });

  it("allows raw keys for MJML fragments", () => {
    const out = interpolateTemplate(
      "X{{ctaBlock}}Y",
      { ctaBlock: "<mj-button>Go</mj-button>" },
      { rawKeys: new Set(["ctaBlock"]) },
    );
    expect(out).toBe("X<mj-button>Go</mj-button>Y");
  });
});

describe("expandMjmlIncludes", () => {
  it("inlines nested partials before interpolation", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjml-partials-"));
    writeFileSync(join(dir, "inner.mjml"), "INNER {{x}}");
    writeFileSync(
      join(dir, "outer.mjml"),
      'START <mj-include path="./inner.mjml" /> END',
    );

    const expanded = expandMjmlIncludes(
      '<mj-include path="./outer.mjml" />',
      dir,
    );
    expect(expanded).toBe("START INNER {{x}} END");
    expect(interpolateTemplate(expanded, { x: "ok" })).toBe("START INNER ok END");
  });
});

describe("business MJML templates", () => {
  it("renders request received with brand chrome", async () => {
    const email = await buildBusinessRequestReceivedEmail({
      businessTitle: "Amavida Coffee",
      requestKind: "listing",
    });

    expect(email.templateId).toBe("business-request-received");
    expect(email.subject).toContain("Amavida Coffee");
    expect(email.text).toMatch(/review/i);
    expect(email.text).toMatch(/go live/i);
    expect(email.html).toContain("WhereTo30A");
    expect(email.html).toContain("Amavida Coffee");
    expect(email.html).not.toContain("Business Portal");
    expect(email.html).not.toContain("Open Business Portal");
    expect(email.html).not.toContain("No action is needed");
    expect(email.html).toContain("#f2f5f5");
    expect(email.html).toContain("#5DA6A8");
    expect(email.html).toContain("color-scheme");
    expect(email.html).toContain("light only");
    expect(email.html).toContain("email-header");
    expect(email.html).toContain("email-light");
    expect(email.html).toContain("/email/logo-header-dark.png");
    expect(email.html).toContain("/email/beach-towns-banner.jpg");
    expect(email.html).toContain("instagram.com/whereto30a");
    expect(email.html).toContain("tiktok.com/@whereto30a");
    expect(email.html).toContain("/email/icons/instagram.png");
    expect(email.html).toContain("/email/icons/tiktok.png");
    expect(email.html).toContain("/email/icons/website.png");
    expect(email.html).toContain("mailto:hello@whereto30a.com");
    expect(email.html).not.toContain("WHERETO30A.COM");
    expect(email.html).not.toContain("{{businessTitle}}");
  });

  it("renders request approved", async () => {
    const email = await buildBusinessRequestApprovedEmail({
      businessTitle: "The Red Bar",
      kind: "listing",
      listingUrl: "https://whereto30a.com/business/the-red-bar",
    });

    expect(email.templateId).toBe("business-request-approved");
    expect(email.subject).toMatch(/approved/i);
    expect(email.html).toContain("You're approved!");
    expect(email.html).toContain("The Red Bar");
    expect(email.html).toContain("#5DA6A8");
    expect(email.html).not.toContain("Business Portal");
    expect(email.html).toContain("View your listing");
    expect(email.html).toContain("/business/the-red-bar");
    expect(email.html).toContain("Your listing is approved and live on WhereTo30A.");
    expect(email.html).not.toContain("Share it anytime");
    expect(email.html).toContain('style="color:#57A0AF;text-decoration:underline');
    expect(email.html).not.toMatch(/class="[^"]*email-cta/);
    expect(email.html).not.toContain("No action is needed");
  });

  it("renders listing / updates live with optional links", async () => {
    const email = await buildListingLiveEmail({
      businessTitle: "Goatfeathers",
      variant: "update",
      listingUrls: ["https://whereto30a.com/business/goatfeathers"],
    });

    expect(email.templateId).toBe("listing-live");
    expect(email.subject).toMatch(/live/i);
    expect(email.html).toContain("Your updates are live");
    expect(email.html).toContain("https://whereto30a.com/business/goatfeathers");
  });

  it("renders listing removed confirmation", async () => {
    const email = await buildListingRemovedEmail({
      businessTitle: "Old Beach Spot",
    });

    expect(email.templateId).toBe("listing-removed");
    expect(email.subject).toMatch(/removed/i);
    expect(email.html).toContain("Listing removed");
    expect(email.html).toContain("We've removed Old Beach Spot from WhereTo30A as requested.");
    expect(email.html).toContain("#5DA6A8");
    expect(email.html).toContain("/email/logo-header-dark.png");
  });

  it("renders portal invite, rejection, payment, and admin alert", async () => {
    const invite = await buildPortalInviteEmail({
      businessTitle: "Bud & Alley's",
      acceptUrl: "https://whereto30a.com/portal/invites/accept?token=abc",
    });
    expect(invite.templateId).toBe("portal-invite");
    expect(invite.html).toContain("Accept invite");
    expect(invite.html).toContain("token=abc");

    const rejected = await buildRequestRejectedEmail({
      businessTitle: "Bud & Alley's",
      kind: "claim",
      adminNotes: "Need proof of ownership.",
      businessSlug: "bud-alleys",
    });
    expect(rejected.templateId).toBe("request-rejected");
    expect(rejected.html).toContain("Need proof of ownership.");
    expect(rejected.html).toContain("list-your-business?business=bud-alleys");

    const needsChanges = await buildReviewNeedsChangesEmail({
      businessTitle: "Bud & Alley's",
      adminNotes: "Clarify hours.",
      businessSlug: "bud-alleys",
    });
    expect(needsChanges.html).toContain("list-your-business?business=bud-alleys");

    const payment = await buildPaymentSuccessEmail({
      businessTitle: "Bud & Alley's",
      cta: portalCta(),
    });
    expect(payment.templateId).toBe("payment-success");
    expect(payment.html).toContain("Local Partner");
    expect(payment.html).toContain("Business Portal");
    expect(payment.html).toContain("/portal");
    expect(payment.html).toContain("Open Business Portal");

    const admin = await buildAdminAlertEmail({
      subject: "[WhereTo30A] Test",
      headline: "Ops alert",
      lead: "Something needs review.",
      detailsHtml: "<p><strong>Item:</strong> 123</p>",
      text: "Ops alert\nItem: 123",
    });
    expect(admin.templateId).toBe("admin-alert");
    expect(admin.html).toContain("Item:");
    expect(admin.html).toContain("#5DA6A8");
  });
});
