import { redirect } from "next/navigation";
import { RentalsAdminClient } from "@/components/admin/RentalsAdminClient";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

export const metadata = {
  title: "Admin · Rentals",
  robots: { index: false, follow: false },
};

export default async function AdminRentalsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect("/");
  const flags = await getAllFeatureFlags();
  if (!isRentalsFeatureEnabled(flags)) redirect("/admin");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-headline text-2xl font-bold tracking-tight text-zinc-900">
        Vacation rentals
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Manage partners and inventory via Supabase (admin API).
      </p>
      <div className="mt-8">
        <RentalsAdminClient />
      </div>
    </div>
  );
}
