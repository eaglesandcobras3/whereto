import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminBusinessEditClient } from "@/components/admin/AdminBusinessEditClient";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
  isBusinessPhotosFeatureEnabled,
  isMultipleCategoryFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Edit business",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminBusinessEditPage({ params }: PageProps) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const { id } = await params;
  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) {
    redirect("/admin/businesses");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm">
        <Link href="/admin/businesses" className="font-medium text-zinc-600 hover:text-zinc-900">
          ← Search businesses
        </Link>
      </p>
      <h1 className="font-headline mt-4 text-2xl font-bold tracking-tight text-zinc-900">
        Edit business
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Saves write to <code className="rounded bg-zinc-100 px-1 text-xs">businesses</code>{" "}
        immediately (not the view, not the review queue).
      </p>
      <div className="mt-8">
        <AdminBusinessEditClient
          businessId={id}
          photosEnabled={isBusinessPhotosFeatureEnabled(flags)}
          multipleCategoryEnabled={isMultipleCategoryFeatureEnabled(flags)}
        />
      </div>
    </div>
  );
}
