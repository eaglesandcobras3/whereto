import { redirect } from "next/navigation";
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
      <h1 className="font-headline text-2xl font-bold tracking-tight text-zinc-900">Portal subscriptions</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Comp Local Partner plans or downgrade businesses without Stripe.
      </p>
      <div className="mt-8">
        <AdminSubscriptionsClient />
      </div>
    </div>
  );
}
