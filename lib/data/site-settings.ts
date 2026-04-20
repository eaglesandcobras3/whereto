import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export type HomeHeroSettings = {
  imageUrl: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
};

type SiteSettingRow = {
  setting_key: string;
  setting_value: unknown;
};

const HOME_DEFAULTS: HomeHeroSettings = {
  imageUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCsXovFV1neXjTq-4mDbgPnbeulhSJTjrnA8HjhYxq8ia7daxCG_LgukxpGv4QFsulirvaswIA6YRwYJFSNId1ug0GSb0xSB5vMk2oIfL018BIDjnqCxf8mngM3LnJVaLLOz3m0qpr65y-xGAT3ZUZZY-fO437YIwlfzKPcpingFhsBIKN7sgwtVTuDefQ2_q6okMXgBEOT4EPmHvjNaVcN3NqSIl8bkXfWsg_h-MxXYQMT-vBNtntZc6L7fARzSUTdkBnVQMREwlc",
  title: "I'm looking for…",
  subtitle: "Your local guide to 30A. Search towns, guides, and trusted local picks.",
  searchPlaceholder: "Search anything on 30A...",
};

function stringFromSetting(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

export async function getPublicSiteSettings(): Promise<Record<string, unknown>> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("site_settings")
    .select("setting_key, setting_value")
    .eq("is_public", true);

  const out: Record<string, unknown> = {};
  for (const row of ((data ?? []) as SiteSettingRow[])) {
    out[row.setting_key] = row.setting_value;
  }
  return out;
}

export async function getHomeHeroSettings(): Promise<HomeHeroSettings> {
  const settings = await getPublicSiteSettings();
  return {
    imageUrl: stringFromSetting(settings["home.hero_image_url"], HOME_DEFAULTS.imageUrl),
    title: stringFromSetting(settings["home.hero_title"], HOME_DEFAULTS.title),
    subtitle: stringFromSetting(settings["home.hero_subtitle"], HOME_DEFAULTS.subtitle),
    searchPlaceholder: stringFromSetting(
      settings["home.search_placeholder"],
      HOME_DEFAULTS.searchPlaceholder,
    ),
  };
}

export async function getSiteSettingsByCategory(category: string) {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("site_settings")
    .select("setting_key, setting_value, setting_category, description, is_public")
    .eq("setting_category", category)
    .order("setting_key");
  return data ?? [];
}

