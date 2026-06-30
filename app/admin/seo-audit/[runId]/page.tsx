import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getAuditRun, listAuditIssuesForRun } from "@/lib/seo/site-audit/storage";

type Props = { params: Promise<{ runId: string }> };

export const metadata = {
  title: "SEO audit report",
  robots: { index: false, follow: false },
};

export default async function AdminSeoAuditRunPage({ params }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const { runId } = await params;
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) notFound();

  const run = await getAuditRun(supabase, runId);
  if (!run) notFound();

  const errors = await listAuditIssuesForRun(supabase, runId, "error");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <AdminPageHeader
        title="SEO audit report"
        description={`${run.base_url} · ${new Date(run.started_at).toLocaleString()} · ${run.status}`}
      />

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-zinc-600">
        <span>URLs crawled: {run.urls_crawled}</span>
        {run.urls_total > run.urls_crawled ? <span>Discovered: {run.urls_total}</span> : null}
        {run.error_message ? (
          <span className="text-red-700">Error: {run.error_message}</span>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Errors ({errors.length}
            {errors.length >= 500 ? "+" : ""})
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {errors.slice(0, 40).map((issue, i) => (
              <li key={`${issue.rule}-${i}`} className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2">
                <span className="font-mono text-xs text-red-800">{issue.rule}</span>
                <p className="mt-1">{issue.detail}</p>
                {issue.url ? (
                  <p className="mt-1 truncate text-xs text-zinc-500">{issue.url}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {run.report_markdown ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Full report</h2>
          <pre className="mt-3 max-h-[70vh] overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-zinc-800">
            {run.report_markdown}
          </pre>
        </section>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">No markdown report stored for this run.</p>
      )}

      <p className="mt-8 text-sm text-zinc-500">
        <Link href="/admin/seo-audit" className="font-medium text-zinc-700 underline hover:text-zinc-900">
          All audit runs
        </Link>
      </p>
    </div>
  );
}
