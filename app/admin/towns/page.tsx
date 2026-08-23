import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceSearchClient } from "@/components/admin/AdminPlaceSearchClient";
import { resolveTownIdForAdmin } from "@/lib/admin/admin-towns";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const metadata = {
  title: "Admin towns",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ q?: string; slug?: string; id?: string }> };

export default async function AdminTownsPage({ searchParams }: PageProps) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-headline text-2xl font-bold text-zinc-900">Towns</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Enable <code className="rounded bg-zinc-100 px-1">admin_business_direct_edit</code> to edit
          towns directly.
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
      const townId = await resolveTownIdForAdmin(supabase, deepRef);
      if (townId) redirect(`/admin/towns/${encodeURIComponent(townId)}`);
    }
  }

  const initialQuery = typeof params.q === "string" ? params.q.trim() : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <AdminPageHeader
        title="Towns"
        description="Search and edit town pages. Deep link with ?slug= or ?id=."
      />
      <p className="mt-4 text-sm">
        <Link href="/admin/towns/new" className="font-medium text-zinc-700 underline">
          Add new town
        </Link>
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading search…</p>}>
          <AdminPlaceSearchClient
            entity="town"
            initialQuery={initialQuery}
            listPath="/admin/towns"
            editPathPrefix="/admin/towns"
            searchApiPath="/api/admin/towns/search"
          />
        </Suspense>
      </div>
    </div>
  );
}
