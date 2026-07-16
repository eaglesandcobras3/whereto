import { describe, expect, it } from "vitest";

import {
  buildBusinessRequestApprovedEmail,
  buildBusinessRequestReceivedEmail,
  buildListingLiveEmail,
} from "@/lib/email/business-templates";
import { escapeHtml } from "@/lib/email/escape";
import { interpolateTemplate } from "@/lib/email/render-mjml";

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

describe("business MJML templates", () => {
  it("renders request received with brand chrome", async () => {
    const email = await buildBusinessRequestReceivedEmail({
      businessTitle: "Amavida Coffee",
      requestKind: "listing",
      cta: { url: "https://whereto30a.com/portal", label: "Open Business Portal" },
    });

    expect(email.templateId).toBe("business-request-received");
    expect(email.subject).toContain("Amavida Coffee");
    expect(email.text).toMatch(/review/i);
    expect(email.text).toMatch(/go live/i);
    expect(email.html).toContain("WhereTo30A");
    expect(email.html).toContain("Amavida Coffee");
    expect(email.html).toContain("Open Business Portal");
    expect(email.html).toContain("#f2f5f5");
    expect(email.html).toContain("#5DA6A8");
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
      cta: { url: "https://whereto30a.com/portal", label: "Open Business Portal" },
    });

    expect(email.templateId).toBe("business-request-approved");
    expect(email.subject).toMatch(/approved/i);
    expect(email.html).toContain("You're approved!");
    expect(email.html).toContain("The Red Bar");
    expect(email.html).toContain("#5DA6A8");
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
});
