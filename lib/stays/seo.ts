import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { staysPropertyPath, staysTownPath, STAYS_HUB_PATH } from "@/lib/stays/constants";
import type { RentalPropertyView } from "@/lib/stays/types";

export function staysHubMetadata(): Metadata {
  return {
    title: "Vacation rentals on 30A | Book directly with local managers",
    description:
      "Find your 30A stay and check availability with trusted local rental companies. Compare homes, then book directly with the property manager.",
    ...canonicalAlternates(STAYS_HUB_PATH),
  };
}

export function staysFilteredMetadata(): Metadata {
  return {
    ...staysHubMetadata(),
    robots: { index: false, follow: true },
  };
}

export function staysPropertyMetadata(property: RentalPropertyView): Metadata {
  const title =
    property.seo_title?.trim() ||
    `${property.title}${property.town_title ? ` in ${property.town_title}` : ""} | 30A vacation rental`;
  const description =
    property.seo_description?.trim() ||
    property.excerpt?.trim() ||
    property.description?.trim()?.slice(0, 160) ||
    `Check availability for ${property.title} with a trusted local 30A rental company.`;
  const path = staysPropertyPath(property.slug);
  const image = property.hero_image_url || property.primary_image_url;

  return {
    title,
    description,
    ...canonicalAlternates(property.duplicate_of_property_id ? STAYS_HUB_PATH : path),
    robots:
      property.status === "published" && property.partner_status === "active"
        ? { index: true, follow: true }
        : { index: false, follow: false },
    openGraph: image
      ? {
          images: [{ url: image }],
        }
      : undefined,
  };
}

export function staysTownMetadata(townTitle: string, townSlug: string): Metadata {
  return {
    title: `Vacation rentals in ${townTitle} | 30A stays`,
    description: `Browse vacation rentals in ${townTitle} and check availability directly with local property managers on WhereTo30A.`,
    ...canonicalAlternates(staysTownPath(townSlug)),
  };
}

export function generateVacationRentalSchema(property: RentalPropertyView, pageUrl: string) {
  const image = property.hero_image_url || property.primary_image_url;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.title,
    description: property.description || property.excerpt || undefined,
    url: pageUrl,
    numberOfRooms: property.bedrooms,
    occupancy: {
      "@type": "QuantitativeValue",
      value: property.sleeps,
    },
    address: property.town_title
      ? {
          "@type": "PostalAddress",
          addressLocality: property.town_title,
          addressRegion: "FL",
          addressCountry: "US",
        }
      : undefined,
    image: image ? [image] : undefined,
    provider: property.business_title
      ? {
          "@type": "Organization",
          name: property.business_title,
          url: property.business_website || undefined,
        }
      : undefined,
  };

  if (
    property.pricing_reliable &&
    property.starting_nightly_rate != null &&
    Number.isFinite(Number(property.starting_nightly_rate))
  ) {
    schema.offers = {
      "@type": "Offer",
      priceCurrency: property.currency || "USD",
      price: Number(property.starting_nightly_rate),
      availability: "https://schema.org/InStock",
    };
  }

  return schema;
}
