import { getSiteUrl } from "@/lib/site-url";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";

export type BreadcrumbItem = {
  name: string;
  /** Relative path (e.g. `/guide/foo`) or absolute URL — required for valid BreadcrumbList JSON-LD. */
  url: string;
};

function toAbsoluteSiteUrl(url: string, siteUrl: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `${siteUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function absoluteHttpUrl(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u?.startsWith("http")) return null;
  return u;
}

function breadcrumbWebPage(name: string, pageUrl: string): object {
  return {
    "@type": "WebPage",
    "@id": pageUrl,
    url: pageUrl,
    name,
  };
}

function isValidAggregateRating(
  rating: number | null | undefined,
  reviewCount: number | null | undefined,
): rating is number {
  if (rating == null || reviewCount == null) return false;
  if (!Number.isFinite(rating) || !Number.isFinite(reviewCount)) return false;
  const count = Math.floor(reviewCount);
  if (count < 1) return false;
  return rating >= 1 && rating <= 5;
}

/**
 * Generate BreadcrumbList JSON-LD schema
 * @param items Array of breadcrumb items — each must include a URL (including the current page).
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const pageUrl = toAbsoluteSiteUrl(item.url, siteUrl);
      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: breadcrumbWebPage(item.name, pageUrl),
      };
    }),
  };
}

/**
 * Generate Place/TouristDestination schema for town pages
 */
export function generateTownSchema(town: {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}): object {
  const siteUrl = getSiteUrl();
  const imageUrl = absoluteHttpUrl(town.imageUrl);

  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${siteUrl}/${town.slug}#place`,
    name: town.name,
    description: town.description || `Discover ${town.name} on Florida's scenic Highway 30A.`,
    url: `${siteUrl}/${town.slug}`,
    ...(imageUrl ? { image: imageUrl } : {}),
    touristType: ["Beach Vacation", "Family Travel", "Couples Getaway"],
    includesAttraction: {
      "@type": "Beach",
      name: `${town.name} Beach`,
    },
    isPartOf: {
      "@type": "TouristDestination",
      name: "30A Florida",
      url: `${siteUrl}/towns`,
    },
    geo: {
      "@type": "GeoCoordinates",
      // 30A general coordinates
      latitude: 30.28,
      longitude: -86.02,
    },
  };
}

/**
 * Generate Area/Place schema
 */
export function generateAreaSchema(area: {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  townName?: string | null;
  townSlug?: string | null;
}): object {
  const siteUrl = getSiteUrl();
  const imageUrl = absoluteHttpUrl(area.imageUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${siteUrl}/area/${area.slug}#place`,
    name: area.name,
    description: area.description || `Explore ${area.name} on 30A.`,
    url: `${siteUrl}/area/${area.slug}`,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(area.townName && area.townSlug
      ? {
          containedInPlace: {
            "@type": "TouristDestination",
            name: area.townName,
            url: `${siteUrl}/${area.townSlug}`,
          },
        }
      : {}),
  };
}

/**
 * Generate Article schema for guide pages
 */
export function generateGuideSchema(guide: {
  title: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
}): object {
  const siteUrl = getSiteUrl();
  const imageUrl = absoluteHttpUrl(guide.imageUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${siteUrl}/guide/${guide.slug}#article`,
    headline: guide.title,
    description: guide.description || `A local guide to ${guide.title} on 30A.`,
    url: `${siteUrl}/guide/${guide.slug}`,
    ...(imageUrl ? { image: imageUrl } : {}),
    author: {
      "@type": "Organization",
      name: "WhereTo30A",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "WhereTo30A",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/siteicon.png`,
      },
    },
    ...(guide.datePublished ? { datePublished: guide.datePublished } : {}),
    ...(guide.dateModified ? { dateModified: guide.dateModified } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/guide/${guide.slug}`,
    },
  };
}

/**
 * Generate LocalBusiness or Organization schema for listing detail pages.
 * LocalBusiness is used when a street address or map coordinates exist; otherwise Organization.
 */
export function generateLocalBusinessSchema(business: {
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  townName?: string | null;
  townSlug?: string | null;
  categoryName?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  priceRange?: string | null;
}): object {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/business/${business.slug}`;
  const hasStreetAddress = Boolean(business.address?.trim());
  const hasGeo =
    business.lat != null &&
    business.lng != null &&
    Number.isFinite(business.lat) &&
    Number.isFinite(business.lng);
  const isLocalBusiness = hasStreetAddress || hasGeo;
  const imageUrl = absoluteHttpUrl(business.imageUrl);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isLocalBusiness ? "LocalBusiness" : "Organization",
    "@id": `${pageUrl}#business`,
    name: business.name,
    url: pageUrl,
  };

  if (business.description) {
    schema.description = business.description;
  }

  if (imageUrl) {
    schema.image = imageUrl;
  }

  if (hasStreetAddress) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: business.address!.trim(),
      addressLocality: business.townName || "30A",
      addressRegion: "FL",
      addressCountry: "US",
    };
  } else if (isLocalBusiness && business.townName) {
    schema.address = {
      "@type": "PostalAddress",
      addressLocality: business.townName,
      addressRegion: "FL",
      addressCountry: "US",
    };
  }

  if (isLocalBusiness && hasGeo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: business.lat,
      longitude: business.lng,
    };
  }

  if (business.phone) {
    schema.telephone = business.phone;
  }

  const sameAs = externalWebsiteHref(business.website);
  if (sameAs) {
    schema.sameAs = [sameAs];
  }

  if (
    isLocalBusiness &&
    isValidAggregateRating(business.rating, business.reviewCount)
  ) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(business.rating * 10) / 10,
      reviewCount: Math.floor(business.reviewCount!),
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (isLocalBusiness && business.priceRange) {
    schema.priceRange = business.priceRange;
  }

  if (business.townName && business.townSlug) {
    schema.areaServed = {
      "@type": "Place",
      name: business.townName,
      url: `${siteUrl}/${business.townSlug}`,
    };
  }

  return schema;
}

/**
 * Generate ItemList schema for listing pages (category hubs, browse results).
 * Uses flat ListItem nodes with `url` + `name` — not nested LocalBusiness stubs.
 */
export function generateItemListSchema(items: Array<{
  name: string;
  url: string;
}>): object {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => {
      const pageUrl = item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`;
      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: pageUrl,
      };
    }),
  };
}
