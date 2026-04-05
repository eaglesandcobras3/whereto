import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

function countOr0(res: { count?: number | null; error?: { message?: string } | null }): number {
  if (res.error) return 0;
  return res.count ?? 0;
}

export default async function AdminHomePage() {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const staleBefore = new Date(Date.now() - 90 * 864e5).toISOString();

  const [biz, jobs, cache, feedback, stale, claims, candidates] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("search_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("query_cache").select("id", { count: "exact", head: true }),
    supabase.from("user_feedback").select("id", { count: "exact", head: true }),
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .lt("last_refreshed_at", staleBefore),
    supabase
      .from("business_claim_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("category_candidates")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending"),
  ]);

  const stats = [
    { label: "Businesses", value: countOr0(biz), href: "/admin/businesses" },
    { label: "Stale 90d+ (active)", value: countOr0(stale), href: "/admin/businesses" },
    { label: "Pending jobs", value: countOr0(jobs), href: "/admin/jobs" },
    { label: "Cached queries", value: countOr0(cache), href: "/admin/cache" },
    { label: "Pending claims", value: countOr0(claims), href: "/admin/claims" },
    { label: "Topic candidates", value: countOr0(candidates), href: "/admin/topic-mining" },
    { label: "Feedback rows", value: countOr0(feedback), href: "/admin/scores" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Quick counts and links. Cron jobs run on Vercel when configured.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-teal-300"
            >
              <p className="text-2xl font-semibold text-zinc-900">{s.value}</p>
              <p className="text-sm text-zinc-600">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
