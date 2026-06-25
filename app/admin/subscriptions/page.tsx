import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSubscriptionsClient } from "@/components/admin/AdminSubscriptionsClient";
import { getAllFeatureFlags, isOnboardEnabled } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Subscriptions",
  robots: { index: false, follow: false },
};

export default async function AdminSubscriptionsPage() {
  const flags = await getAllFeatureFlags();
  if (!isOnboardEnabled(flags)) {
    redirect("/");
  }

  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <AdminPageHeader
        title="Portal subscriptions"
        description="Comp Local Partner plans or downgrade businesses without Stripe."
      />
      <div className="mt-8">
        <AdminSubscriptionsClient />
      </div>
    </div>
  );
}
