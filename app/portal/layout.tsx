import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAllFeatureFlags, isOnboardEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Business Portal",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const flags = await getAllFeatureFlags();
  if (!isOnboardEnabled(flags)) {
    redirect("/");
  }

  return <>{children}</>;
}
