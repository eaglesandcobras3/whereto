import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalBillingClient } from "@/components/portal/PortalBillingClient";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

export default function PortalBillingPage() {
  return (
    <PortalShell active="billing">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Upgrade a listing to Local Partner for more photos, hours, social links, and a full description.
      </p>
      <Suspense fallback={<p className="mt-6 text-sm text-[var(--color-text-secondary)]">Loading…</p>}>
        <PortalBillingClient />
      </Suspense>
    </PortalShell>
  );
}
