import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminBusinessSearchClient } from "@/components/admin/AdminBusinessSearchClient";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { resolveBusinessIdForAdminEdit } from "@/lib/admin/search-businesses-for-edit";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const metadata = {
  title: "Admin businesses",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ q?: string; slug?: string; id?: string }>;
};

export default async function AdminBusinessesPage({ searchParams }: PageProps) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-headline text-2xl font-bold text-zinc-900">Businesses</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Direct business edit is off. Enable the PostHog flag{" "}
          <code className="rounded bg-zinc-100 px-1">admin_business_direct_edit</code> (or set{" "}
          <code className="rounded bg-zinc-100 px-1">ADMIN_BUSINESS_DIRECT_EDIT_ENABLED=1</code>{" "}
          locally).
        </p>
        <p className="mt-6 text-sm">
          <Link href="/admin" className="font-medium text-zinc-700 underline">
            Back to admin
          </Link>
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const slugRef = typeof params.slug === "string" ? params.slug.trim() : "";
  const idRef = typeof params.id === "string" ? params.id.trim() : "";
  const deepRef = slugRef || idRef;

  if (deepRef) {
    const supabase = getServiceSupabaseOrNull();
    if (supabase) {
      const businessId = await resolveBusinessIdForAdminEdit(supabase, deepRef);
      if (businessId) {
        redirect(`/admin/businesses/${encodeURIComponent(businessId)}`);
      }
    }
  }

  const initialQuery = typeof params.q === "string" ? params.q.trim() : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm">
        <Link href="/admin" className="font-medium text-zinc-600 hover:text-zinc-900">
          ← Admin
        </Link>
      </p>
      <h1 className="font-headline mt-4 text-2xl font-bold tracking-tight text-zinc-900">
        Edit businesses
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Search by name or slug and edit directly. Changes publish immediately — no review queue.
        Deep link with <code className="rounded bg-zinc-100 px-1 text-xs">?slug=</code> or{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">?id=</code>.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading search…</p>}>
          <AdminBusinessSearchClient initialQuery={initialQuery} />
        </Suspense>
      </div>
      {deepRef && !initialQuery ? (
        <p className="mt-4 text-sm text-amber-800">
          No business found for <code className="rounded bg-amber-50 px-1">{deepRef}</code>.
        </p>
      ) : null}
    </div>
  );
}
