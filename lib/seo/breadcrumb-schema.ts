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
        item: {
          "@type": "WebPage",
          "@id": pageUrl,
          name: item.name,
          url: pageUrl,
        },
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

  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${siteUrl}/${town.slug}#place`,
    name: town.name,
    description: town.description || `Discover ${town.name} on Florida's scenic Highway 30A.`,
    url: `${siteUrl}/${town.slug}`,
    ...(town.imageUrl ? { image: [town.imageUrl] } : {}),
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

  return {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${siteUrl}/area/${area.slug}#place`,
    name: area.name,
    description: area.description || `Explore ${area.name} on 30A.`,
    url: `${siteUrl}/area/${area.slug}`,
    ...(area.imageUrl ? { image: [area.imageUrl] } : {}),
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

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${siteUrl}/guide/${guide.slug}#article`,
    headline: guide.title,
    description: guide.description || `A local guide to ${guide.title} on 30A.`,
    url: `${siteUrl}/guide/${guide.slug}`,
    ...(guide.imageUrl ? { image: [guide.imageUrl] } : {}),
    author: {
      "@type": "Organization",
      name: "WhereTo30A",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "WhereTo30A",
      url: siteUrl,
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
 * Generate enhanced LocalBusiness schema
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

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/business/${business.slug}#business`,
    name: business.name,
    url: `${siteUrl}/business/${business.slug}`,
  };

  if (business.description) {
    schema.description = business.description;
  }

  if (business.imageUrl) {
    schema.image = [business.imageUrl];
  }

  if (business.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.townName || "30A",
      addressRegion: "FL",
      addressCountry: "US",
    };
  }

  if (business.lat != null && business.lng != null) {
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

  if (business.rating != null && business.reviewCount != null && business.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: business.rating,
      reviewCount: business.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (business.priceRange) {
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
 * Generate ItemList schema for listing pages (search results, category pages)
 */
export function generateItemListSchema(items: Array<{
  name: string;
  url: string;
  imageUrl?: string | null;
  description?: string | null;
}>): object {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LocalBusiness",
        name: item.name,
        url: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
        ...(item.imageUrl ? { image: item.imageUrl } : {}),
        ...(item.description ? { description: item.description } : {}),
      },
    })),
  };
}
