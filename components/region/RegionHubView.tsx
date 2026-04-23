import Link from "next/link";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { TownCard } from "@/components/discovery/TownCard";
import { getRegionDescriptor, getTownDescriptor } from "@/lib/data/town-descriptors";
import type { AdjacentTown } from "@/lib/data/town-hub";

type RegionRecord = { id: string; name: string; slug: string };

export function RegionHubView({
  region,
  towns,
}: {
  region: RegionRecord;
  towns: AdjacentTown[];
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <header className="space-y-4 text-center">
            <p className="text-eyebrow">Region</p>
            <h1 className="text-hero text-[var(--color-text-primary)]">
              {region.name}
            </h1>
            <p className="mx-auto max-w-xl text-lg text-[var(--color-text-secondary)]">
              {getRegionDescriptor(region.slug)}
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-light)] transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                AI Search
              </Link>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        <SectionBlock
          title={`Towns in ${region.name}`}
          subtitle="Pick a town for a curated local guide"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {towns.map((t) => (
              <TownCard
                key={t.slug}
                name={t.name}
                slug={t.slug}
                subtitle={getTownDescriptor(t.slug)}
              />
            ))}
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}
