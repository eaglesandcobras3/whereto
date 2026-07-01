import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  generateBreadcrumbSchema,
  generateItemListSchema,
  generateLocalBusinessSchema,
} from "@/lib/seo/breadcrumb-schema";

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
      { name: "Coffee Shops", url: "/coffee-shops" },
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
      "@id": "https://whereto30a.com/coffee-shops",
      url: "https://whereto30a.com/coffee-shops",
      name: "Coffee Shops",
    });

    for (const entry of schema.itemListElement) {
      expect(entry.item["@type"]).toBe("WebPage");
      expect(entry.item.url).toMatch(/^https:\/\/whereto30a\.com\//);
      expect(entry.item["@id"]).toBe(entry.item.url);
    }
  });
});

describe("generateItemListSchema", () => {
  const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://whereto30a.com";
  });

  afterEach(() => {
    if (prevSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
  });

  it("uses flat ListItem url entries instead of nested LocalBusiness nodes", () => {
    const schema = generateItemListSchema([
      { name: "Amavida Coffee", url: "/business/amavida-coffee" },
    ]) as {
      itemListElement: Array<{
        "@type": string;
        position: number;
        name: string;
        url: string;
        item?: unknown;
      }>;
    };

    expect(schema.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Amavida Coffee",
      url: "https://whereto30a.com/business/amavida-coffee",
    });
    expect(schema.itemListElement[0].item).toBeUndefined();
  });
});

describe("generateLocalBusinessSchema", () => {
  const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://whereto30a.com";
  });

  afterEach(() => {
    if (prevSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
  });

  it("emits Organization when a listing has no postal address", () => {
    const schema = generateLocalBusinessSchema({
      name: "Mobile Detailing Co",
      slug: "mobile-detailing-co",
    }) as { "@type": string; address?: unknown; geo?: unknown; priceRange?: unknown };

    expect(schema["@type"]).toBe("Organization");
    expect(schema.address).toBeUndefined();
    expect(schema.geo).toBeUndefined();
    expect(schema.priceRange).toBeUndefined();
  });

  it("emits LocalBusiness with geo and priceRange when coordinates exist but street address is missing", () => {
    const schema = generateLocalBusinessSchema({
      name: "Barefoot BBQ",
      slug: "barefoot-bbq-seaside-fl",
      lat: 30.321,
      lng: -86.141,
      townName: "Seaside",
      townSlug: "seaside",
      priceRange: "$$",
    }) as {
      "@type": string;
      address: { streetAddress?: string; addressLocality: string };
      geo: { latitude: number; longitude: number };
      priceRange: string;
    };

    expect(schema["@type"]).toBe("LocalBusiness");
    expect(schema.address.addressLocality).toBe("Seaside");
    expect(schema.address.streetAddress).toBeUndefined();
    expect(schema.geo.latitude).toBe(30.321);
    expect(schema.priceRange).toBe("$$");
  });

  it("does not emit geo or priceRange on Organization listings", () => {
    const schema = generateLocalBusinessSchema({
      name: "Remote Brand",
      slug: "remote-brand",
      priceRange: "$",
    }) as { "@type": string; geo?: unknown; priceRange?: unknown };

    expect(schema["@type"]).toBe("Organization");
    expect(schema.geo).toBeUndefined();
    expect(schema.priceRange).toBeUndefined();
  });

  it("emits LocalBusiness when a listing has a postal address", () => {
    const schema = generateLocalBusinessSchema({
      name: "Amavida Coffee",
      slug: "amavida-coffee",
      address: "123 Main St",
      townName: "Seaside",
      townSlug: "seaside",
    }) as { "@type": string; address: { streetAddress: string } };

    expect(schema["@type"]).toBe("LocalBusiness");
    expect(schema.address.streetAddress).toBe("123 Main St");
  });
});
