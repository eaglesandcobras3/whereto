import "server-only";

import {
  HOME_HERO_IMAGE_PATH,
  resolveHomeHeroImageUrl,
} from "@/lib/home/hero-image";

export { HOME_HERO_IMAGE_PATH } from "@/lib/home/hero-image";

export type HomeHeroSettings = {
  imageUrl: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
};

/** Static homepage hero (public/hero.webp). */
const DEFAULTS: HomeHeroSettings = {
  imageUrl: HOME_HERO_IMAGE_PATH,
  title: "Your local guide to 30A, Florida",
  subtitle:
    "From Rosemary Beach to Seaside and beyond, each town along Scenic Highway 30A has its own pace. Find where to eat, what to do, and the beach-access details worth knowing before you arrive.",
  searchPlaceholder: "Search anything on 30A...",
};

/** Default hero image — used for OG fallbacks when a page has no listing image. */
export const DEFAULT_HOME_HERO_IMAGE_URL = DEFAULTS.imageUrl;

function fromEnv(k: string, fallback: string): string {
  const v = process.env[k]?.trim();
  if (v) return v;
  return fallback;
}

/**
 * Public hero copy and image. Override with `HOME_HERO_IMAGE_URL`, `HOME_HERO_TITLE`, etc.
 * (Or extend this module if you add a `site_settings` table later.)
 */
export async function getPublicSiteSettings(): Promise<Record<string, unknown>> {
  return {
    "home.hero_image_url": resolveHomeHeroImageUrl(process.env.HOME_HERO_IMAGE_URL),
    "home.hero_title": fromEnv("HOME_HERO_TITLE", DEFAULTS.title),
    "home.hero_subtitle": fromEnv("HOME_HERO_SUBTITLE", DEFAULTS.subtitle),
    "home.search_placeholder": fromEnv("HOME_SEARCH_PLACEHOLDER", DEFAULTS.searchPlaceholder),
  };
}

export async function getHomeHeroSettings(): Promise<HomeHeroSettings> {
  const s = await getPublicSiteSettings();
  return {
    imageUrl: String(s["home.hero_image_url"] ?? DEFAULTS.imageUrl),
    title: String(s["home.hero_title"] ?? DEFAULTS.title),
    subtitle: String(s["home.hero_subtitle"] ?? DEFAULTS.subtitle),
    searchPlaceholder: String(s["home.search_placeholder"] ?? DEFAULTS.searchPlaceholder),
  };
}

export async function getSiteSettingsByCategory(_category: string) {
  return [] as {
    setting_key: string;
    setting_value: unknown;
    setting_category: string;
    description: string | null;
    is_public: boolean;
  }[];
}
