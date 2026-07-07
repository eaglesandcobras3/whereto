import type { Metadata } from "next";
import { Suspense } from "react";
import { AskPageShell } from "@/components/ask/AskPageShell";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Ask WhereTo30A",
  description:
    "AI concierge for 30A. Discover verified restaurants, coffee, activities, and local guides.",
  robots: { index: false, follow: false },
};

export const revalidate = 21600;

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      }
    >
      <AskPageShell />
    </Suspense>
  );
}
