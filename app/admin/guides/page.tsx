import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GuidesAdminClient } from "@/components/admin/GuidesAdminClient";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Guides",
  robots: { index: false, follow: false },
};

export default async function AdminGuidesPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <AdminPageHeader
        title="Guides"
        description="Create and edit editorial guides. Enrich for SEO before publishing."
      />
      <div className="mt-8">
        <GuidesAdminClient />
      </div>
    </div>
  );
}
