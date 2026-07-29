import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CommunityTipsAdminClient } from "@/components/admin/CommunityTipsAdminClient";
import { getAllFeatureFlags, isCommunityTipsFeatureEnabled } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Community tips",
  robots: { index: false, follow: false },
};

export default async function AdminCommunityTipsPage() {
  const flags = await getAllFeatureFlags();
  if (!isCommunityTipsFeatureEnabled(flags)) {
    redirect("/");
  }

  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <AdminPageHeader
        title="Community tips"
        description="Approve text tips before they appear publicly. Stars are optional. Publish, reject, hide, or delete."
      />
      <div className="mt-8">
        <CommunityTipsAdminClient />
      </div>
    </div>
  );
}
