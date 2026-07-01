import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GuideEditorClient } from "@/components/admin/GuideEditorClient";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Edit guide",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditGuidePage({ params }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <AdminPageHeader
        backHref="/admin/guides"
        backLabel="Guides"
        title="Edit guide"
        description="Update markdown, relationships, and status. Re-enrich after major content changes."
      />
      <div className="mt-8">
        <GuideEditorClient guideId={id} />
      </div>
    </div>
  );
}
