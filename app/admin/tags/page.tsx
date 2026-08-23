import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTagsClient } from "@/components/admin/AdminTagsClient";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Search tags",
  robots: { index: false, follow: false },
};

export default async function AdminTagsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <AdminPageHeader
        title="Search tags"
        description="Canonical tags for business discover search and listing enrichment."
      />
      <div className="mt-8">
        <AdminTagsClient />
      </div>
    </div>
  );
}
