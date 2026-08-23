import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminTownEditClient } from "@/components/admin/AdminTownEditClient";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Edit town",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminTownEditPage({ params }: PageProps) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) redirect("/admin/towns");

  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm">
        <Link href="/admin/towns" className="font-medium text-zinc-600 hover:text-zinc-900">
          ← Search towns
        </Link>
      </p>
      <h1 className="font-headline mt-4 text-2xl font-bold tracking-tight text-zinc-900">Edit town</h1>
      <div className="mt-8">
        <AdminTownEditClient townId={id} />
      </div>
    </div>
  );
}
