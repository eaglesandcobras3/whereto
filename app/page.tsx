import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";
import { getHomeExplorerData } from "@/lib/data/home-explorer";
import { getHomeFeaturedStrips } from "@/lib/data/home-features";

export default async function Home() {
  const [explorer, featured] = await Promise.all([
    getHomeExplorerData(),
    getHomeFeaturedStrips(),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--surface)]" aria-hidden />}>
      <HomePage explorer={explorer} featured={featured} />
    </Suspense>
  );
}
