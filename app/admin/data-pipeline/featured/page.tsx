import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { PromptWorkflow, StatsBar, BackLink } from "../components";
import { saveFeaturedAction } from "./actions";

async function getData() {
  const supabase = getServiceSupabase();

  const [businesses, categories, towns] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, slug, ai_one_liner, ai_family_score, ai_date_score, ai_value_score, towns(name)")
      .eq("status", "active")
      .not("ai_reasoning_updated_at", "is", null)
      .order("confidence_score", { ascending: false })
      .limit(50),
    supabase.from("categories").select("id, name, slug").order("discovery_priority"),
    supabase.from("towns").select("id, name, slug").order("name"),
  ]);

  return {
    businesses: businesses.data ?? [],
    categories: categories.data ?? [],
    towns: towns.data ?? [],
  };
}

function generatePrompt(
  businesses: { id: string; name: string; slug: string; ai_one_liner?: string | null; towns?: unknown }[],
  categories: { id: number; name: string }[],
  towns: { id: number; name: string }[]
) {
  const bizList = businesses.slice(0, 30).map((b) => {
    const town = b.towns as { name: string } | null;
    return `- ${b.name} (${town?.name ?? "Unknown"}) - ${b.ai_one_liner ?? "No description"}`;
  }).join("\n");

  const catList = categories.map(c => `- ${c.name}`).join("\n");
  const townList = towns.map(t => `- ${t.name}`).join("\n");

  return `You are curating featured content for a 30A/Emerald Coast local directory homepage.

AVAILABLE BUSINESSES (top 30 by quality):
${bizList}

CATEGORIES:
${catList}

TOWNS:
${townList}

Create curated featured sections. Return JSON with:

{
  "featuredBusinesses": [
    {
      "businessName": "exact name from list",
      "reason": "Why this is featured (1 sentence)",
      "badge": "EDITOR'S PICK | LOCAL FAVORITE | BEST VALUE | ROMANTIC | FAMILY FRIENDLY"
    }
  ],
  "featuredCategories": [
    {
      "categoryName": "exact name from list",
      "headline": "Catchy 5-7 word headline",
      "description": "2 sentence description for homepage"
    }
  ],
  "townSpotlights": [
    {
      "townName": "exact name from list",
      "tagline": "6-10 word tagline",
      "featuredFor": "What this town is best for (romantic getaway, family vacation, etc.)"
    }
  ],
  "curatedCollections": [
    {
      "title": "Collection name (e.g., 'Date Night on 30A')",
      "description": "1 sentence description",
      "businessNames": ["list", "of", "business", "names", "from", "above"]
    }
  ]
}

Select:
- 6-8 featured businesses (diverse mix)
- 4-6 featured categories
- 3-4 town spotlights
- 2-3 curated collections with 4-6 businesses each`;
}

export default async function FeaturedPage() {
  await requireAdmin();
  const { businesses, categories, towns } = await getData();
  const bizForPrompt = businesses.map((b) => ({
    id: b.id as string,
    name: b.name as string,
    slug: b.slug as string,
    ai_one_liner: b.ai_one_liner as string | null,
    towns: b.towns as unknown,
  }));
  const prompt = generatePrompt(bizForPrompt, categories, towns);

  return (
    <div className="space-y-8">
      <BackLink href="/admin/data-pipeline" label="Back to Pipeline" />

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Step 5: Featured Curation</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create curated featured sections for your homepage: editor picks, collections, spotlights.
        </p>
      </div>

      <StatsBar stats={[
        { label: "Enriched Businesses", value: businesses.length },
        { label: "Categories", value: categories.length },
        { label: "Towns", value: towns.length },
      ]} />

      <PromptWorkflow
        title="Curate Featured Content"
        description="Create homepage featured sections"
        prompt={prompt}
        itemCount={businesses.length > 0 ? 1 : 0}
        saveAction={saveFeaturedAction}
      />

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What gets created:</h3>
        <div className="grid gap-2 sm:grid-cols-2 text-sm text-blue-800">
          <div>• Featured business picks with badges</div>
          <div>• Featured category highlights</div>
          <div>• Town spotlight sections</div>
          <div>• Curated collections (e.g., "Date Night on 30A")</div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> This creates/updates records in a <code>featured_content</code> table.
          Make sure to run the migration first if the table doesn't exist.
        </p>
      </div>
    </div>
  );
}
