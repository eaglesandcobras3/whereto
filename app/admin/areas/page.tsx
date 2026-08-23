import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceSearchClient } from "@/components/admin/AdminPlaceSearchClient";
import { resolveAreaIdForAdmin } from "@/lib/admin/admin-areas";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const metadata = {
  title: "Admin areas",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ q?: string; slug?: string; id?: string }> };

export default async function AdminAreasPage({ searchParams }: PageProps) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-headline text-2xl font-bold text-zinc-900">Areas</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Enable <code className="rounded bg-zinc-100 px-1">admin_business_direct_edit</code> to edit
          areas directly.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const deepRef =
    (typeof params.slug === "string" ? params.slug.trim() : "") ||
    (typeof params.id === "string" ? params.id.trim() : "");

  if (deepRef) {
    const supabase = getServiceSupabaseOrNull();
    if (supabase) {
      const areaId = await resolveAreaIdForAdmin(supabase, deepRef);
      if (areaId) redirect(`/admin/areas/${encodeURIComponent(areaId)}`);
    }
  }

  const initialQuery = typeof params.q === "string" ? params.q.trim() : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <AdminPageHeader
        title="Areas"
        description="Search and edit area/neighborhood pages. Deep link with ?slug= or ?id=."
      />
      <p className="mt-4 text-sm">
        <Link href="/admin/areas/new" className="font-medium text-zinc-700 underline">
          Add new area
        </Link>
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading search…</p>}>
          <AdminPlaceSearchClient
            entity="area"
            initialQuery={initialQuery}
            listPath="/admin/areas"
            editPathPrefix="/admin/areas"
            searchApiPath="/api/admin/areas/search"
          />
        </Suspense>
      </div>
    </div>
  );
}
