import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminBusinessSearchClient } from "@/components/admin/AdminBusinessSearchClient";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Admin businesses",
  robots: { index: false, follow: false },
};

export default async function AdminBusinessesPage() {
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
        Search a listing and edit it directly. Changes publish immediately — no review queue.
      </p>
      <div className="mt-8">
        <AdminBusinessSearchClient />
      </div>
    </div>
  );
}
