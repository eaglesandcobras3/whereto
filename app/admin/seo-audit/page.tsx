import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { listAuditRuns } from "@/lib/seo/site-audit/storage";

export const metadata = {
  title: "SEO audit",
  robots: { index: false, follow: false },
};

export default async function AdminSeoAuditPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const supabase = getServiceSupabaseOrNull();
  const runs = supabase ? await listAuditRuns(supabase, 12) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <AdminPageHeader
        title="SEO site audit"
        description="Automated crawl reports (twice weekly via cron). Covers indexability, content, links, structured data, sitemaps, and social tags."
      />

      {!supabase ? (
        <p className="mt-6 text-sm text-amber-800">
          Supabase is not configured — reports are only available when the cron stores runs.
        </p>
      ) : runs.length === 0 ? (
        <div className="mt-8 space-y-3 text-sm text-zinc-600">
          <p>No audit runs yet.</p>
          <p>
            Apply{" "}
            <code className="rounded bg-zinc-100 px-1">scripts/migrations/seo-audit-tables.sql</code>{" "}
            in Supabase, then trigger:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
            {`curl -H "Authorization: Bearer $CRON_SECRET" \\
  "https://whereto30a.com/api/cron/seo-audit"`}
          </pre>
          <p>
            Or locally: <code className="rounded bg-zinc-100 px-1">npm run audit:seo -- --live</code>
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">URLs</th>
                <th className="px-4 py-3 font-medium">Issues</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {runs.map((run) => {
                const summary = run.summary as {
                  issueCounts?: { error?: number; warning?: number; notice?: number };
                };
                const errors = summary.issueCounts?.error ?? 0;
                const warnings = summary.issueCounts?.warning ?? 0;
                const notices = summary.issueCounts?.notice ?? 0;
                return (
                  <tr key={run.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-800">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          run.status === "completed"
                            ? "text-green-700"
                            : run.status === "failed"
                              ? "text-red-700"
                              : "text-amber-700"
                        }
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {run.urls_crawled}
                      {run.urls_total > run.urls_crawled ? ` / ${run.urls_total}` : ""}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <span className="text-red-700">{errors}e</span>
                      {" · "}
                      <span className="text-amber-700">{warnings}w</span>
                      {" · "}
                      <span className="text-zinc-500">{notices}n</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/seo-audit/${run.id}`}
                        className="font-medium text-zinc-700 underline hover:text-zinc-900"
                      >
                        View report
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
