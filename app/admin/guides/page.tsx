import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GuidesAdminClient } from "@/components/admin/GuidesAdminClient";
import { isGuideAdminStatusFilter } from "@/lib/admin/place-constants";
import { resolveGuideIdForAdmin } from "@/lib/admin/guides";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const metadata = {
  title: "Guides",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ q?: string; slug?: string; id?: string; status?: string }>;
};

export default async function AdminGuidesPage({ searchParams }: PageProps) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const params = await searchParams;
  const deepRef =
    (typeof params.slug === "string" ? params.slug.trim() : "") ||
    (typeof params.id === "string" ? params.id.trim() : "");

  if (deepRef) {
    const supabase = getServiceSupabaseOrNull();
    if (supabase) {
      const guideId = await resolveGuideIdForAdmin(supabase, deepRef);
      if (guideId) redirect(`/admin/guides/${encodeURIComponent(guideId)}`);
    }
  }

  const initialQuery = typeof params.q === "string" ? params.q.trim() : "";
  const initialStatus =
    typeof params.status === "string" && isGuideAdminStatusFilter(params.status)
      ? params.status
      : "active";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <AdminPageHeader
        title="Guides"
        description="Create and edit editorial guides. Enrich for SEO before publishing. Deep link with ?slug= or ?id=."
      />
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading guides…</p>}>
          <GuidesAdminClient initialQuery={initialQuery} initialStatus={initialStatus} />
        </Suspense>
      </div>
    </div>
  );
}
