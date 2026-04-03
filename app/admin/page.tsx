import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export default async function AdminHomePage() {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const [biz, jobs, cache, feedback] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase
      .from("search_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("query_cache").select("id", { count: "exact", head: true }),
    supabase.from("user_feedback").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Businesses", value: biz.count ?? 0, href: "/admin/businesses" },
    { label: "Pending jobs", value: jobs.count ?? 0, href: "/admin/jobs" },
    { label: "Cached queries", value: cache.count ?? 0, href: "/admin/scores" },
    { label: "Feedback rows", value: feedback.count ?? 0, href: "/admin/scores" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Quick counts and links. Cron jobs run on Vercel when configured.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
