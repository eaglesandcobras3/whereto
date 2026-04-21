import { requireAdmin } from "@/lib/admin/require-admin";
import { getSiteSettingsByCategory } from "@/lib/data/site-settings";
import { updateHomeHeroSettingsAction } from "./actions";
import { HeroImageUploadField } from "./hero-image-upload-field";

function valAsString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export default async function SiteSettingsPage() {
  await requireAdmin();
  const homeSettings = await getSiteSettingsByCategory("home");
  const map = new Map(homeSettings.map((s) => [s.setting_key as string, s.setting_value]));

  const heroImage = valAsString(map.get("home.hero_image_url"));
  const heroTitle = valAsString(map.get("home.hero_title"), "I'm looking for...");
  const heroSubtitle = valAsString(
    map.get("home.hero_subtitle"),
    "Your local guide to 30A. Search towns, guides, and trusted local picks.",
  );
  const searchPlaceholder = valAsString(
    map.get("home.search_placeholder"),
    "Search anything on 30A...",
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Site Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          WordPress-style global options for homepage and brand-level content.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Homepage Hero</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Controls the hero image, title, subtitle, and search placeholder.
        </p>
        <form action={updateHomeHeroSettingsAction} className="mt-6 space-y-4">
          <HeroImageUploadField defaultValue={heroImage} />
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Hero title</label>
            <input
              name="hero_title"
              defaultValue={heroTitle}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Hero subtitle</label>
            <textarea
              name="hero_subtitle"
              defaultValue={heroSubtitle}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Search placeholder</label>
            <input
              name="search_placeholder"
              defaultValue={searchPlaceholder}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Save Homepage Settings
          </button>
        </form>
      </section>
    </div>
  );
}

