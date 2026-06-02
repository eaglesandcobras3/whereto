import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { generateBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";

describe("generateBreadcrumbSchema", () => {
  const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://whereto30a.com";
  });

  afterEach(() => {
    if (prevSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
  });

  it("includes WebPage item on every ListItem (business detail example)", () => {
    const schema = generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Watersound", url: "/watersound" },
      { name: "Coffee Shops", url: "/categories/coffee_shops" },
      { name: "Starbucks Cafe Watersound", url: "/business/starbucks-cafe-watersound" },
    ]) as {
      itemListElement: Array<{
        position: number;
        name: string;
        item: { "@type": string; "@id": string; name: string; url: string };
      }>;
    };

    expect(schema.itemListElement).toHaveLength(4);

    const categoryCrumb = schema.itemListElement[2];
    expect(categoryCrumb.position).toBe(3);
    expect(categoryCrumb.name).toBe("Coffee Shops");
    expect(categoryCrumb.item).toEqual({
      "@type": "WebPage",
      "@id": "https://whereto30a.com/categories/coffee_shops",
      name: "Coffee Shops",
      url: "https://whereto30a.com/categories/coffee_shops",
    });

    for (const entry of schema.itemListElement) {
      expect(entry.item?.["@id"]).toMatch(/^https:\/\/whereto30a\.com\//);
      expect(entry.item?.name).toBe(entry.name);
    }
  });
});
