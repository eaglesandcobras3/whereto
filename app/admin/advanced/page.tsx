import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";

const ADVANCED_SECTIONS: Array<{
  title: string;
  description: string;
  links: Array<{ href: string; label: string; note?: string }>;
}> = [
  {
    title: "Data Pipeline",
    description: "Operational ingestion and enrichment workflows.",
    links: [
      { href: "/admin/data-pipeline", label: "Pipeline overview" },
      { href: "/admin/data-pipeline/business-discovery", label: "Business discovery" },
      { href: "/admin/data-pipeline/business-enrichment", label: "Business enrichment" },
      { href: "/admin/data-pipeline/categories", label: "Category enrichment" },
      { href: "/admin/data-pipeline/town-enrichment", label: "Town enrichment" },
      { href: "/admin/data-pipeline/featured", label: "Featured pipeline" },
    ],
  },
  {
    title: "Legacy Curation Tools",
    description: "Older moderation/curation surfaces kept for fallback use.",
    links: [
      { href: "/admin/discovery", label: "Discovery" },
      { href: "/admin/bulk-tags", label: "Bulk tags" },
      { href: "/admin/featured", label: "Featured content (legacy)" },
      { href: "/admin/duplicates", label: "Duplicates" },
      { href: "/admin/claims", label: "Claims" },
      { href: "/admin/topic-mining", label: "Topic mining" },
      { href: "/admin/scores", label: "Scores", note: "feedback/signal inspection" },
    ],
  },
  {
    title: "Ingestion Controls",
    description: "Manual controls tied to external-directory and refresh flows.",
    links: [{ href: "/admin/ingestion", label: "Ingestion controls" }],
  },
];

export default async function AdminAdvancedToolsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Advanced Tools</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Secondary and legacy admin surfaces. Core daily work should stay in Site settings, Content,
          Media, Businesses, Categories, Jobs, Feature flags, and Cache.
        </p>
      </div>

      <div className="space-y-6">
        {ADVANCED_SECTIONS.map((section) => (
          <section key={section.title} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{section.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{section.description}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 transition-colors hover:border-teal-300 hover:bg-white"
                  >
                    {link.label}
                    {link.note ? (
                      <span className="mt-1 block text-xs font-normal text-zinc-500">{link.note}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

