import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const metadata = {
  title: "Discover search gaps",
  robots: { index: false, follow: false },
};

type GapRow = {
  id: string;
  term: string;
  hit_count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_raw_query: string;
  last_parsed_category: string | null;
  last_parsed_town: string | null;
  last_parsed_tags: string[];
  status: string;
  operator_notes: string | null;
  resolved_tag: string | null;
};

export default async function AdminDiscoverGapsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const supabase = getServiceSupabaseOrNull();
  let gaps: GapRow[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("discover_search_gaps")
      .select(
        "id, term, hit_count, first_seen_at, last_seen_at, last_raw_query, last_parsed_category, last_parsed_town, last_parsed_tags, status, operator_notes, resolved_tag",
      )
      .eq("status", "open")
      .order("hit_count", { ascending: false })
      .limit(100);

    if (error) {
      console.error("AdminDiscoverGapsPage", error);
    } else {
      gaps = (data ?? []) as GapRow[];
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <AdminPageHeader
        title="Discover search gaps"
        description="Terms users searched for that did not map to search_tags_vocabulary. Use this to grow tags, aliases, and listing coverage."
      />

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Alerts</p>
        <p className="mt-2">
          PostHog fires <code className="rounded bg-white px-1">discover_tag_unresolved</code> on
          each new gap batch. Create an alert on that event (or on rising{" "}
          <code className="rounded bg-white px-1">hit_count</code> via weekly review).
        </p>
      </div>

      {!supabase ? (
        <p className="mt-6 text-sm text-amber-800">Supabase is not configured.</p>
      ) : gaps.length === 0 ? (
        <div className="mt-8 space-y-3 text-sm text-zinc-600">
          <p>No open gaps recorded yet. Apply the migration, then search /discover with unmatched terms.</p>
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
            {`-- scripts/migrations/discover-search-gaps.sql`}
          </pre>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Term</th>
                <th className="px-4 py-3 font-medium">Hits</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 font-medium">Example query</th>
                <th className="px-4 py-3 font-medium">Last parse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {gaps.map((gap) => (
                <tr key={gap.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">{gap.term}</td>
                  <td className="px-4 py-3 text-zinc-700">{gap.hit_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {new Date(gap.last_seen_at).toLocaleString()}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-600" title={gap.last_raw_query}>
                    {gap.last_raw_query}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {gap.last_parsed_town ? `town=${gap.last_parsed_town} ` : ""}
                    {gap.last_parsed_category ? `cat=${gap.last_parsed_category} ` : ""}
                    {gap.last_parsed_tags?.length
                      ? `tags=${gap.last_parsed_tags.join(",")}`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-sm text-zinc-500">
        <Link href="/admin" className="font-medium text-zinc-700 underline hover:text-zinc-900">
          Back to admin
        </Link>
      </p>
    </div>
  );
}
