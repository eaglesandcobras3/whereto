import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { getAllFeatureFlags, isOnboardEnabled } from "@/lib/feature-flags";
import { requirePortalUser } from "@/lib/portal/require-portal-user";

export const metadata: Metadata = {
  title: "Business Portal",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const flags = await getAllFeatureFlags();
  if (!isOnboardEnabled(flags)) {
    redirect("/");
  }

  const session = await requirePortalUser();
  if (!session) {
    redirect("/login?next=/portal");
  }

  return <>{children}</>;
}
