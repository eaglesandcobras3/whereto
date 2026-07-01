import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GuideEditorClient } from "@/components/admin/GuideEditorClient";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "New guide",
  robots: { index: false, follow: false },
};

export default async function AdminNewGuidePage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <AdminPageHeader
        backHref="/admin/guides"
        backLabel="Guides"
        title="New guide"
        description="Write markdown, link a town or place, then save and enrich before publishing."
      />
      <div className="mt-8">
        <GuideEditorClient />
      </div>
    </div>
  );
}
