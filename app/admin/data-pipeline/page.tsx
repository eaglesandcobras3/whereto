import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

async function getStats() {
  const supabase = getServiceSupabase();

  const [categories, businesses, towns] = await Promise.all([
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("towns").select("*", { count: "exact", head: true }),
  ]);

  const [enrichedBusinesses, enrichedTowns] = await Promise.all([
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "active").not("ai_reasoning_updated_at", "is", null),
    supabase.from("towns").select("*", { count: "exact", head: true }).not("ai_enrichment_updated_at", "is", null),
  ]);

  return {
    categories: categories.count ?? 0,
    businesses: businesses.count ?? 0,
    businessesEnriched: enrichedBusinesses.count ?? 0,
    towns: towns.count ?? 0,
    townsEnriched: enrichedTowns.count ?? 0,
  };
}

const steps = [
  {
    number: 1,
    title: "Category Mining",
    description: "Discover and create categories for your directory",
    href: "/admin/data-pipeline/categories",
    icon: "🏷️",
  },
  {
    number: 2,
    title: "Business Discovery",
    description: "Find businesses to add to each category",
    href: "/admin/data-pipeline/business-discovery",
    icon: "🔍",
  },
  {
    number: 3,
    title: "Business Enrichment",
    description: "Add AI-generated details to businesses",
    href: "/admin/data-pipeline/business-enrichment",
    icon: "✨",
  },
  {
    number: 4,
    title: "Town Enrichment",
    description: "Add AI-generated details to towns",
    href: "/admin/data-pipeline/town-enrichment",
    icon: "🏖️",
  },
  {
    number: 5,
    title: "Featured Curation",
    description: "Select featured businesses and categories",
    href: "/admin/data-pipeline/featured",
    icon: "⭐",
  },
];

export default async function DataPipelinePage() {
  await requireAdmin();
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Data Pipeline</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Build your directory step-by-step using ChatGPT. No API costs - just copy prompts and paste responses.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-zinc-900">{stats.categories}</p>
          <p className="text-xs text-zinc-500">Categories</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-zinc-900">{stats.businesses}</p>
          <p className="text-xs text-zinc-500">Businesses</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-teal-700">{stats.businessesEnriched}</p>
          <p className="text-xs text-zinc-500">Enriched Businesses</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-zinc-900">{stats.towns}</p>
          <p className="text-xs text-zinc-500">Towns</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-teal-700">{stats.townsEnriched}</p>
          <p className="text-xs text-zinc-500">Enriched Towns</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Workflow Steps</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <Link
              key={step.number}
              href={step.href}
              className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl group-hover:bg-teal-50">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-400">Step {step.number}</span>
                  </div>
                  <h3 className="font-semibold text-zinc-900 group-hover:text-teal-700">{step.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{step.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Click on a step to open its workflow page</li>
          <li>Copy the generated prompt</li>
          <li>Paste into ChatGPT (Plus subscription = free)</li>
          <li>Copy ChatGPT&apos;s JSON response</li>
          <li>Paste back and click Save</li>
          <li>Repeat until done, then move to the next step</li>
        </ol>
      </div>
    </div>
  );
}
