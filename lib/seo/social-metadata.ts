import type { Metadata } from "next";
import { DEFAULT_HOME_HERO_IMAGE_URL } from "@/lib/data/site-settings";
import { getSiteUrl } from "@/lib/site-url";

/** Fallback when a page has no hero/listing image (absolute URL for OG crawlers). */
export function defaultOpenGraphImageUrl(): string {
  const fromEnv = process.env.HOME_HERO_IMAGE_URL?.trim();
  return fromEnv || DEFAULT_HOME_HERO_IMAGE_URL;
}

type OpenGraphPageOptions = {
  path: string;
  title: string;
  description: string;
  imageUrl?: string | null;
};

/** Page-level Open Graph + Twitter tags with required image for social crawlers. */
export function openGraphForPage({
  path,
  title,
  description,
  imageUrl,
}: OpenGraphPageOptions): Pick<Metadata, "openGraph" | "twitter"> {
  const base = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;
  const image = imageUrl?.trim() || defaultOpenGraphImageUrl();

  return {
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "WhereTo30A",
      locale: "en_US",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
