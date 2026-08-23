import { redirect } from "next/navigation";
import { AdminCategoriesClient } from "@/components/admin/AdminCategoriesClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Categories",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <AdminPageHeader
        title="Categories"
        description="Unified business category taxonomy as stored in the database."
      />
      <div className="mt-8">
        <AdminCategoriesClient />
      </div>
    </div>
  );
}
