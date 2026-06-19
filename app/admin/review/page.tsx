import { redirect } from "next/navigation";
import { ReviewQueueClient } from "@/components/admin/ReviewQueueClient";
import { getAllFeatureFlags, isOnboardEnabled } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Review queue",
  robots: { index: false, follow: false },
};

export default async function AdminReviewPage() {
  const flags = await getAllFeatureFlags();
  if (!isOnboardEnabled(flags)) {
    redirect("/");
  }

  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-headline text-2xl font-bold tracking-tight text-zinc-900">Portal review queue</h1>
      <p className="mt-2 text-sm text-zinc-600">Approve or reject business claims and new listing submissions.</p>
      <div className="mt-8">
        <ReviewQueueClient />
      </div>
    </div>
  );
}
