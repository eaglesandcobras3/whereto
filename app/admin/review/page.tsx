import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReviewQueueClient } from "@/components/admin/ReviewQueueClient";
import { getAllFeatureFlags, isReviewQueueEnabled } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Review queue",
  robots: { index: false, follow: false },
};

export default async function AdminReviewPage() {
  const flags = await getAllFeatureFlags();
  if (!isReviewQueueEnabled(flags)) {
    redirect("/");
  }

  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <AdminPageHeader
        title="Listing review queue"
        description="Approve or reject free intake submissions, claims, edits, and photos."
      />
      <div className="mt-8">
        <ReviewQueueClient />
      </div>
    </div>
  );
}
