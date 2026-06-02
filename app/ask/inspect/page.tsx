import { notFound } from "next/navigation";
import { getAllFeatureFlags, isSearchInspectorEnabled } from "@/lib/feature-flags";
import { InspectFlow } from "@/components/ask/inspect/InspectFlow";

export const metadata = {
  title: "Search Inspector — WhereTo30A",
  robots: { index: false, follow: false },
};

export default async function InspectPage() {
  const flags = await getAllFeatureFlags();
  if (!isSearchInspectorEnabled(flags)) notFound();

  return (
    <main className="min-h-screen px-4 pb-16 pt-8">
      <InspectFlow />
    </main>
  );
}
