import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

function countOr0(res: { count?: number | null; error?: { message?: string } | null }): number {
  if (res.error) return 0;
  return res.count ?? 0;
}

function getStaleBeforeDate() {
  return new Date(Date.now() - 90 * 864e5).toISOString();
}

export default async function AdminHomePage() {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const staleBefore = getStaleBeforeDate();

  const [biz, jobs, cache, stale, flags, entries] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("search_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("query_cache").select("id", { count: "exact", head: true }),
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .lt("last_refreshed_at", staleBefore),
    supabase.from("feature_flags").select("id", { count: "exact", head: true }),
    supabase.from("content_entries").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Site settings", value: "Edit", href: "/admin/site-settings" },
    { label: "Content entries", value: countOr0(entries), href: "/admin/content" },
    { label: "Media manager", value: "Open", href: "/admin/media" },
    { label: "Businesses", value: countOr0(biz), href: "/admin/businesses" },
    { label: "Categories", value: "Manage", href: "/admin/categories" },
    { label: "Stale 90d+ (active)", value: countOr0(stale), href: "/admin/jobs" },
    { label: "Pending jobs", value: countOr0(jobs), href: "/admin/jobs" },
    { label: "Cached queries", value: countOr0(cache), href: "/admin/cache" },
    { label: "Feature Flags", value: countOr0(flags), href: "/admin/feature-flags" },
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
