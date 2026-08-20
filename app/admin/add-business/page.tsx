import { redirect } from "next/navigation";
import { AdminAddBusinessClient } from "@/components/admin/AdminAddBusinessClient";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Add business",
  robots: { index: false, follow: false },
};

export default async function AdminAddBusinessPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminPageHeader
        title="Add business"
        description="Queue new listings, then Apply to run Gemini verify + import. Unverified rows land in Needs review."
      />
      <div className="mt-8">
        <AdminAddBusinessClient />
      </div>
    </div>
  );
}
