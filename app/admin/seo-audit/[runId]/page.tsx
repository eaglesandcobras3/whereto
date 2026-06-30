import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getAuditRun, shouldStoreAuditReports } from "@/lib/seo/site-audit/storage";

type Props = { params: Promise<{ runId: string }> };

export const metadata = {
  title: "SEO audit report",
  robots: { index: false, follow: false },
};

export default async function AdminSeoAuditRunPage({ params }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  if (!shouldStoreAuditReports()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-sm text-zinc-600">
          Report storage is disabled. Run{" "}
          <code className="rounded bg-zinc-100 px-1">npm run audit:seo -- --live</code> locally.
        </p>
        <Link href="/admin/seo-audit" className="mt-4 inline-block text-sm underline">
          Back
        </Link>
      </div>
    );
  }

  const { runId } = await params;
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) notFound();

  const run = await getAuditRun(supabase, runId);
  if (!run) notFound();

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
