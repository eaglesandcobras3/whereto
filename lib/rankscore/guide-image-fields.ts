import type { SupabaseClient } from "@supabase/supabase-js";

const DIRECTUS_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GuideImageColumnSupport = {
  urlImageFields: boolean;
};

export async function detectGuideImageColumnSupport(
  supabase: SupabaseClient,
): Promise<GuideImageColumnSupport> {
  const { error } = await supabase.from("guides").select("main_image_url, hero_image_url").limit(1);
  return { urlImageFields: !error };
}

/** Apply hero to insert/update payload — never put HTTP URLs in UUID columns. */
export function applyGuideHeroFields(
  payload: Record<string, unknown>,
  hero: string | null | undefined,
  support: GuideImageColumnSupport,
): void {
  const value = String(hero ?? "").trim();
  if (!value) return;

  if (DIRECTUS_UUID_REGEX.test(value)) {
    payload.main_image = value;
    payload.hero_image = value;
    return;
  }

  if (/^https?:\/\//i.test(value) && support.urlImageFields) {
    payload.main_image_url = value;
    payload.hero_image_url = value;
  }
}
