"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

async function upsertSetting(
  key: string,
  value: unknown,
  category: string,
  description: string,
  isPublic = true,
) {
  const supabase = getServiceSupabase();
  await supabase.from("site_settings").upsert(
    {
      setting_key: key,
      setting_value: value,
      setting_category: category,
      description,
      is_public: isPublic,
    },
    { onConflict: "setting_key" },
  );
}

export async function updateHomeHeroSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const heroImage = String(formData.get("hero_image_url") ?? "").trim();
  const heroTitle = String(formData.get("hero_title") ?? "").trim();
  const heroSubtitle = String(formData.get("hero_subtitle") ?? "").trim();
  const searchPlaceholder = String(formData.get("search_placeholder") ?? "").trim();

  await Promise.all([
    upsertSetting("home.hero_image_url", heroImage, "home", "Homepage hero background image URL"),
    upsertSetting("home.hero_title", heroTitle, "home", "Homepage hero title"),
    upsertSetting("home.hero_subtitle", heroSubtitle, "home", "Homepage hero subtitle"),
    upsertSetting(
      "home.search_placeholder",
      searchPlaceholder,
      "home",
      "Homepage search input placeholder",
    ),
  ]);

  revalidatePath("/admin/site-settings");
  revalidatePath("/");
}

