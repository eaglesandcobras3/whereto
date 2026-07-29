import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { isGscConfigured } from "@/lib/irse/gsc/config";
import { IrseScorerClient } from "./IrseScorerClient";

export const metadata = {
  title: "Index readiness",
  robots: { index: false, follow: false },
};

export default async function AdminIrsePage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const gscReady = isGscConfigured();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <AdminPageHeader
        title="Index readiness scoring"
        description="Score a page for Google index readiness (entity, content, SEO, discovery, trust). See docs/PRD-IRSE.md."
      />

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Calibration</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            CLI: <code className="rounded bg-white px-1">npm run calibrate:irse</code>
            {" "}
            or CSV labels{" "}
            <code className="rounded bg-white px-1">
              --indexed=… --not-indexed=… --tune-weights
            </code>
          </li>
          <li>
            Runs automatically on <strong>push to main</strong> (GitHub Actions) — not on PR builds
          </li>
          <li>
            GSC:{" "}
            {gscReady ? (
              <span className="text-emerald-800">configured</span>
            ) : (
              <span className="text-amber-800">
                not configured — set GSC_SITE_URL + service account env vars (see OPERATOR-TODO)
              </span>
            )}
          </li>
        </ul>
      </div>

      <Suspense fallback={<p className="mt-8 text-sm text-zinc-500">Loading scorer…</p>}>
        <IrseScorerClient />
      </Suspense>
    </div>
  );
}
