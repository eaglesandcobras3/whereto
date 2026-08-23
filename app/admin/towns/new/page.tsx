import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNewTownClient } from "@/components/admin/AdminNewTownClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "New town",
  robots: { index: false, follow: false },
};

export default async function AdminNewTownPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) redirect("/admin/towns");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm">
        <Link href="/admin/towns" className="font-medium text-zinc-600 hover:text-zinc-900">
          ← Towns
        </Link>
      </p>
      <AdminPageHeader title="New town" description="Create a draft town, then fill in content and publish." />
      <div className="mt-8">
        <AdminNewTownClient />
      </div>
    </div>
  );
}
