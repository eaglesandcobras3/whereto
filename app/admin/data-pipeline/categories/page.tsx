import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { PromptWorkflow, StatsBar, BackLink } from "../components";
import { saveCategoriesAction } from "./actions";

async function getStats() {
  const supabase = getServiceSupabase();
  const { count: total } = await supabase.from("categories").select("*", { count: "exact", head: true });
  const { count: withDescription } = await supabase.from("categories").select("*", { count: "exact", head: true }).not("description", "is", null);
  return {
    total: total ?? 0,
    withDescription: withDescription ?? 0,
  };
}

async function getExistingCategories() {
  const supabase = getServiceSupabase();
  const { data } = await supabase.from("categories").select("name, slug").order("name");
  return data ?? [];
}

function generatePrompt(existingCategories: { name: string; slug: string }[]) {
  const existing = existingCategories.length > 0
    ? `\nExisting categories (don't duplicate these):\n${existingCategories.map(c => `- ${c.name}`).join("\n")}\n`
    : "";

  return `You are helping build a local directory for Florida's 30A/Emerald Coast area. Generate a comprehensive list of business categories for this beach resort region.
${existing}
Consider categories for:
- Dining (restaurants, cafes, bars, bakeries, etc.)
- Activities (water sports, tours, fitness, golf, etc.)
- Shopping (boutiques, art galleries, markets, etc.)
- Services (spas, salons, photography, rentals, etc.)
- Accommodation-related (property management, concierge, etc.)
- Family (kid-friendly activities, camps, etc.)

For EACH category, provide:
{
  "name": "Display name",
  "slug": "url-friendly-slug",
  "description": "2-3 sentence description of what this category includes",
  "googleTypes": ["relevant", "google_place_types"],
  "icon": "emoji representing this category",
  "priority": 1-10 (1=most important to show)
}

Return a JSON array of 15-25 categories. Focus on what visitors to 30A would actually search for.

Example format:
[
  {
    "name": "Seafood Restaurants",
    "slug": "seafood-restaurants",
    "description": "Fresh Gulf seafood and waterfront dining experiences. From casual fish shacks to upscale seafood houses.",
    "googleTypes": ["restaurant", "seafood_restaurant"],
    "icon": "🦐",
    "priority": 2
  }
]`;
}

export default async function CategoriesPage() {
  await requireAdmin();
  const stats = await getStats();
  const existingCategories = await getExistingCategories();
  const prompt = generatePrompt(existingCategories);

  return (
    <div className="space-y-8">
      <BackLink href="/admin/data-pipeline" label="Back to Pipeline" />

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Step 1: Category Mining</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Discover and create categories for your directory. Run multiple times to expand.
        </p>
      </div>

      <StatsBar stats={[
        { label: "Total Categories", value: stats.total },
        { label: "With Descriptions", value: stats.withDescription, highlight: true },
        { label: "Need Description", value: stats.total - stats.withDescription },
      ]} />

      <PromptWorkflow
        title="Generate Categories"
        description="Discover new categories for your directory"
        prompt={prompt}
        itemCount={1} // Always allow running
        saveAction={saveCategoriesAction}
      />

      {existingCategories.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900 mb-4">Existing Categories ({existingCategories.length})</h2>
          <div className="flex flex-wrap gap-2">
            {existingCategories.map((c) => (
              <span key={c.slug} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
