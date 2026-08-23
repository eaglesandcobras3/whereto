import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAreaEditClient } from "@/components/admin/AdminAreaEditClient";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Edit area",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminAreaEditPage({ params }: PageProps) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) redirect("/admin/areas");

  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm">
        <Link href="/admin/areas" className="font-medium text-zinc-600 hover:text-zinc-900">
          ← Search areas
        </Link>
      </p>
      <h1 className="font-headline mt-4 text-2xl font-bold tracking-tight text-zinc-900">Edit area</h1>
      <div className="mt-8">
        <AdminAreaEditClient areaId={id} />
      </div>
    </div>
  );
}
