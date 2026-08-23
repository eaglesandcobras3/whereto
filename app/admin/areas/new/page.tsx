import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNewAreaClient } from "@/components/admin/AdminNewAreaClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "New area",
  robots: { index: false, follow: false },
};

export default async function AdminNewAreaPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) redirect("/admin/areas");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm">
        <Link href="/admin/areas" className="font-medium text-zinc-600 hover:text-zinc-900">
          ← Areas
        </Link>
      </p>
      <AdminPageHeader title="New area" description="Create a draft area, assign a town, then publish." />
      <div className="mt-8">
        <AdminNewAreaClient />
      </div>
    </div>
  );
}
