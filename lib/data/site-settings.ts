import "server-only";

export type HomeHeroSettings = {
  imageUrl: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
};

const DEFAULTS: HomeHeroSettings = {
  imageUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCsXovFV1neXjTq-4mDbgPnbeulhSJTjrnA8HjhYxq8ia7daxCG_LgukxpGv4QFsulirvaswIA6YRwYJFSNId1ug0GSb0xSB5vMk2oIfL018BIDjnqCxf8mngM3LnJVaLLOz3m0qpr65y-xGAT3ZUZZY-fO437YIwlfzKPcpingFhsBIKN7sgwtVTuDefQ2_q6okMXgBEOT4EPmHvjNaVcN3NqSIl8bkXfWsg_h-MxXYQMT-vBNtntZc6L7fARzSUTdkBnVQMREwlc",
  title: "I'm looking for…",
  subtitle: "Your local guide to 30A. Search towns, guides, and trusted local picks.",
  searchPlaceholder: "Search anything on 30A...",
};

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
    "home.hero_image_url": fromEnv("HOME_HERO_IMAGE_URL", DEFAULTS.imageUrl),
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
