import Link from "next/link";
import { Suspense } from "react";
import { loadLatestIrseScore } from "@/lib/irse/storage";
import type { PageKind } from "@/lib/irse/types";
import { INDEX_READY_THRESHOLD } from "@/lib/irse/weights";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

type Props = {
  kind: PageKind;
  slug: string;
};

function bandLabel(band: string | null): string {
  if (!band) return "unscored";
  return band.replace(/_/g, " ");
}

async function IrseAdminBadgeInner({ kind, slug }: Props) {
  const admin = await requireAdminUser();
  if (!admin) return null;

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return null;

  const score = await loadLatestIrseScore(supabase, kind, slug.trim());
  const scorerHref = `/admin/irse?kind=${encodeURIComponent(kind)}&slug=${encodeURIComponent(slug)}`;

  if (!score) {
    return (
      <aside
        className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 shadow-lg"
        data-admin-only="irse"
      >
        <p className="font-semibold">IRSE · no snapshot</p>
        <p className="mt-0.5 text-amber-900/80">
          Score this page from admin or run{" "}
          <code className="rounded bg-amber-100/80 px-0.5">npm run calibrate:irse -- --score-all</code>.
        </p>
        <Link href={scorerHref} className="mt-1 inline-block font-medium underline hover:no-underline">
          Open scorer
        </Link>
      </aside>
    );
  }

  const ready = score.indexReady;
  return (
    <aside
      className={`fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border px-3 py-2 text-xs shadow-lg ${
        ready
          ? "border-emerald-300 bg-emerald-50 text-emerald-950"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
      data-admin-only="irse"
    >
      <p className="font-semibold">
        IRSE {Math.round(score.overallScore)}
        <span className="ml-1 font-normal opacity-80">
          · {ready ? `index ready (≥${INDEX_READY_THRESHOLD})` : "not index ready"} ·{" "}
          {bandLabel(score.band)}
        </span>
      </p>
      <p className="mt-0.5 opacity-70">
        Scored {new Date(score.scoredAt).toLocaleDateString()}
        {score.confidence != null ? ` · confidence ${Math.round(score.confidence)}` : ""}
      </p>
      <Link href={scorerHref} className="mt-1 inline-block font-medium underline hover:no-underline">
        Details / re-score
      </Link>
    </aside>
  );
}

/** Admin-only IRSE score chip. Reads precomputed snapshot — no scoring API on pageview. */
export function IrseAdminBadge(props: Props) {
  return (
    <Suspense fallback={null}>
      <IrseAdminBadgeInner {...props} />
    </Suspense>
  );
}
