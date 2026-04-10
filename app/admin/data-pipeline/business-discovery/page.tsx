import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { PromptWorkflow, StatsBar, BackLink } from "../components";
import { saveBusinessesAction } from "./actions";

async function getStats() {
  const supabase = getServiceSupabase();
  const { count: businesses } = await supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "active");
  const { count: categories } = await supabase.from("categories").select("*", { count: "exact", head: true });
  return {
    businesses: businesses ?? 0,
    categories: categories ?? 0,
  };
}

async function getCategoriesAndTowns() {
  const supabase = getServiceSupabase();
  const [cats, towns] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("towns").select("id, name, slug").order("name"),
  ]);
  return {
    categories: cats.data ?? [],
    towns: towns.data ?? [],
  };
}

function generatePrompt(
  categories: { id: number; name: string; slug: string }[],
  towns: { id: number; name: string; slug: string }[],
  selectedCategory?: string,
  selectedTown?: string
) {
  const categoryInfo = selectedCategory
    ? `Focus on: ${selectedCategory}`
    : `Categories available:\n${categories.map(c => `- ${c.name} (ID: ${c.id})`).join("\n")}`;

  const townInfo = selectedTown
    ? `Location: ${selectedTown}`
    : `Towns:\n${towns.map(t => `- ${t.name} (ID: ${t.id})`).join("\n")}`;

  return `You are helping build a local directory for Florida's 30A/Emerald Coast area. Generate a list of REAL businesses for this region.

${categoryInfo}

${townInfo}

IMPORTANT: Only include REAL businesses that actually exist on 30A. Do not make up fictional businesses.

For EACH business, provide:
{
  "name": "Actual business name",
  "address": "Full street address",
  "town_id": <town ID from list above>,
  "category_id": <category ID from list above>,
  "lat": <latitude as number>,
  "lng": <longitude as number>,
  "phone": "phone number if known",
  "website": "website URL if known",
  "google_place_id": "Google Place ID if you know it",
  "description": "1-2 sentence description of what makes this place notable"
}

Return a JSON array of 10-20 REAL businesses. Be accurate - these will be verified.

Example:
[
  {
    "name": "The Red Bar",
    "address": "70 Hotz Ave, Grayton Beach, FL 32459",
    "town_id": 4,
    "category_id": 1,
    "lat": 30.3574,
    "lng": -86.1579,
    "phone": "(850) 231-1008",
    "website": "https://theredbar.com",
    "description": "Iconic 30A dive bar and restaurant known for live music and eclectic decor."
  }
]`;
}

export default async function BusinessDiscoveryPage() {
  await requireAdmin();
  const stats = await getStats();
  const { categories, towns } = await getCategoriesAndTowns();
  const prompt = generatePrompt(categories, towns);

  return (
    <div className="space-y-8">
      <BackLink href="/admin/data-pipeline" label="Back to Pipeline" />

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Step 2: Business Discovery</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Find real businesses to add to your directory. Run for each category/town combination.
        </p>
      </div>

      <StatsBar stats={[
        { label: "Total Businesses", value: stats.businesses },
        { label: "Categories", value: stats.categories },
        { label: "Towns", value: towns.length },
      ]} />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Tip:</strong> Edit the prompt to focus on specific categories or towns. Run multiple times with different focuses to build comprehensive coverage.
        </p>
      </div>

      <PromptWorkflow
        title="Discover Businesses"
        description="Find real businesses for your directory"
        prompt={prompt}
        itemCount={1}
        saveAction={saveBusinessesAction}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900 mb-4">Categories ({categories.length})</h2>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {categories.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="text-zinc-400 mr-2">ID {c.id}:</span>
                <span className="text-zinc-700">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900 mb-4">Towns ({towns.length})</h2>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {towns.map((t) => (
              <div key={t.id} className="text-sm">
                <span className="text-zinc-400 mr-2">ID {t.id}:</span>
                <span className="text-zinc-700">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
