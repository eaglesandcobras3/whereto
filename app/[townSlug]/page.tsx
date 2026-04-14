import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getTownBySlug,
  getTownsInRegion,
  getRegionBySlug,
  getAdjacentTownNames,
  getAdjacentTownBusinessPreviews,
  getTownHubExpandedSections,
  getTownGuidePreview,
  mergeTownFeaturedBusinessRecommendations,
  getFeaturedGuidesForTown,
} from "@/lib/data/town-hub";
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import { BusinessCard } from "@/components/discovery/BusinessCard";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { RegionHubView } from "@/components/region/RegionHubView";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { Metadata } from "next";

type Props = { params: Promise<{ townSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug } = await params;
  const town = await getTownBySlug(townSlug);
  if (!town) return { title: "Town Guide" };
  return {
    title: `${town.name} Local Guide — WhereTo30A`,
    description: `Discover the best restaurants, shops, and things to do in ${town.name}, FL. Curated local insights.`,
  };
}
export default async function TownPage({ params }: Props) {
  const { townSlug } = await params;
  if (isReservedRootSlug(townSlug)) notFound();

  // Check if this is a region
  const region = await getRegionBySlug(townSlug);
  if (region) {
    const towns = await getTownsInRegion(region.id);
    return <RegionHubView region={region} towns={towns} />;
  }

  // Fetch town data
  const town = await getTownBySlug(townSlug);
  if (!town) notFound();

  // Parallel fetch town data
  const [adjacent, expanded, nearbyBiz, guidePreview, featuredGuides] = await Promise.all([
    getAdjacentTownNames(town.id),
    getTownHubExpandedSections(town.slug, town.name),
    getAdjacentTownBusinessPreviews(town.id, 10),
    getTownGuidePreview(town.slug),
    getFeaturedGuidesForTown(town.id),
  ]);

  const featuredBusinessRecs = mergeTownFeaturedBusinessRecommendations(
    [expanded.topPicks, expanded.coffee, expanded.shopping],
    12,
  );

  const descriptor = getTownDescriptor(town.slug);
  const townPage = Array.isArray(town.pages) ? (town.pages[0] as { body_markdown: string } | undefined) : (town.pages as { body_markdown: string } | undefined);

  return (
    <div className="pb-32">
      {/* Town Hero */}
        <section className="relative h-[650px] w-full flex items-end overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* Placeholder for real town image, wire to DB later */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-background)] via-transparent to-black/30" />
            <div className="h-full w-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-[var(--color-text-tertiary)]">
               <span className="material-symbols-outlined !text-9xl opacity-10">beach_access</span>
            </div>
          </div>
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-16 md:px-10">
            <div className="max-w-2xl">
              <span className="inline-block bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
                TOWN EXPLORER
              </span>
              <h1 className="font-headline text-6xl md:text-8xl font-extrabold tracking-tighter text-[var(--color-text-primary)] mb-6">
                {town.name}
              </h1>
              <p className="text-lg md:text-xl text-[var(--color-text-secondary)] leading-relaxed max-w-lg">
                {descriptor}
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-20 space-y-32 md:px-10">
          {/* Rich Markdown Content */}
          {townPage?.body_markdown && (
            <section className="mx-auto max-w-4xl">
              <MarkdownRenderer content={townPage.body_markdown} />
            </section>
          )}
          {/* Curated picks: dining, coffee, and shopping in one lane */}
          {featuredBusinessRecs.length > 0 && (
            <SectionBlock
              title="Featured businesses"
              subtitle={`Hand-picked restaurants, coffee, and shopping in ${town.name}.`}
            >
              <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-x-auto hide-scrollbar sm:grid">
                {featuredBusinessRecs.map((rec) => (
                  <BusinessCard key={rec.business_id} rec={rec} variant="consumer" />
                ))}
              </ul>
            </SectionBlock>
          )}

          {featuredGuides.length > 0 && (
            <SectionBlock
              title="Featured guides"
              subtitle={`Stories and roundups focused on ${town.name} and the nearby coast.`}
            >
              <ul className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                {featuredGuides.map((g) => (
                  <li
                    key={g.slug}
                    className="min-w-[280px] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm transition-shadow hover:shadow-md"
                  >
                    <Link href={`/guide/${g.slug}`} className="group block">
                      {g.og_image_url?.startsWith("http") ? (
                        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[var(--color-border)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={g.og_image_url}
                            alt={g.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-[16/10] w-full items-center justify-center bg-[var(--color-surface-container-high)] text-[var(--color-text-tertiary)]">
                          <span className="material-symbols-outlined !text-4xl opacity-40">menu_book</span>
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="font-headline text-lg font-bold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                          {g.title}
                        </h3>
                        {g.excerpt ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                            {g.excerpt}
                          </p>
                        ) : null}
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                          Read guide
                          <span className="material-symbols-outlined !text-base transition-transform group-hover:translate-x-0.5">
                            arrow_forward
                          </span>
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}

          {/* Town Guide Preview */}
          {guidePreview && (guidePreview.ai_description || guidePreview.ai_tagline) && (
            <section className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
              <div className="grid md:grid-cols-2">
                {/* Left: Content */}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] mb-4">
                    <span className="material-symbols-outlined !text-sm">menu_book</span>
                    Local Guide
                  </span>
                  <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] mb-4">
                    {town.name} Vacation Guide
                  </h2>
                  {guidePreview.ai_tagline && (
                    <p className="text-lg text-[var(--color-primary)] font-medium mb-4">
                      {guidePreview.ai_tagline}
                    </p>
                  )}
                  {guidePreview.ai_description && (
                    <p className="text-[var(--color-text-secondary)] leading-relaxed mb-6 line-clamp-4">
                      {guidePreview.ai_description}
                    </p>
                  )}

                  {/* Quick scores */}
                  {(guidePreview.ai_family_score || guidePreview.ai_romance_score) && (
                    <div className="flex flex-wrap gap-4 mb-6">
                      {guidePreview.ai_family_score && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="material-symbols-outlined !text-base text-blue-500">family_restroom</span>
                          <span className="text-[var(--color-text-secondary)]">Family:</span>
                          <span className="font-bold text-[var(--color-text-primary)]">{guidePreview.ai_family_score}/10</span>
                        </div>
                      )}
                      {guidePreview.ai_romance_score && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="material-symbols-outlined !text-base text-rose-500">favorite</span>
                          <span className="text-[var(--color-text-secondary)]">Romance:</span>
                          <span className="font-bold text-[var(--color-text-primary)]">{guidePreview.ai_romance_score}/10</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vibe tags */}
                  {guidePreview.ai_vibe && guidePreview.ai_vibe.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {guidePreview.ai_vibe.slice(0, 4).map((v) => (
                        <span
                          key={v}
                          className="rounded-full bg-[var(--color-surface-container-high)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/guide/${town.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-all w-fit"
                  >
                    Read Full Guide
                    <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                  </Link>
                </div>

                {/* Right: Highlights */}
                <div className="bg-[var(--color-surface-container-low)] p-8 md:p-12">
                  {guidePreview.ai_must_see && guidePreview.ai_must_see.length > 0 && (
                    <div className="mb-8">
                      <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[var(--color-text-primary)] mb-4">
                        <span className="material-symbols-outlined text-[var(--color-primary)]">place</span>
                        Must-See Spots
                      </h3>
                      <ul className="space-y-2">
                        {guidePreview.ai_must_see.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {guidePreview.ai_local_tips && guidePreview.ai_local_tips.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="flex items-center gap-2 font-headline text-sm font-bold text-amber-900 mb-3">
                        <span className="material-symbols-outlined !text-base">tips_and_updates</span>
                        Local Tip
                      </h3>
                      <p className="text-sm text-amber-800">
                        {guidePreview.ai_local_tips[0]}
                      </p>
                    </div>
                  )}

                  {guidePreview.ai_best_for && guidePreview.ai_best_for.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-3">
                        Best For
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {guidePreview.ai_best_for.slice(0, 4).map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Resources / Guides */}
                  {guidePreview.related_guides && guidePreview.related_guides.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4">
                        Local Resources
                      </h3>
                      <ul className="grid grid-cols-1 gap-3">
                        {guidePreview.related_guides.map((g) => (
                          <li key={g.slug}>
                            <Link 
                              href={`/guide/${g.slug}`}
                              className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors group"
                            >
                              <span className="material-symbols-outlined !text-base text-zinc-300 group-hover:text-[var(--color-primary)]">description</span>
                              {g.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Worth the short drive */}
          {nearbyBiz.length > 0 && (
            <SectionBlock 
              title="Worth the short drive" 
              subtitle="Hand-picked favorites from neighboring towns — still on the coast."
            >
              <ul className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                {nearbyBiz.map((b) => (
                  <li key={b.id} className="min-w-[320px] snap-start group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm transition-all hover:shadow-md">
                    <Link href={`/business/${b.slug}`} className="block relative aspect-video overflow-hidden">
                      {b.image_url ? (
                        <Image src={b.image_url} alt={b.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                      ) : (
                        <div className="h-full w-full bg-[var(--color-surface-container-high)] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[var(--color-text-tertiary)] opacity-30">storefront</span>
                        </div>
                      )}
                    </Link>
                    <div className="p-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">{b.townName}</p>
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{b.name}</h3>
                      <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)] mb-4">{b.ai_summary || "Explore more about this local favorite."}</p>
                      <Link href={`/business/${b.slug}`} className="text-sm font-bold text-[var(--color-primary)] flex items-center gap-1">
                        View Details <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}

          {/* Quick Town Search */}
          <section className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-12 md:p-20 text-center">
            <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-[var(--color-text-primary)] mb-6">
              Explore {town.name}
            </h2>
            <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto mb-10 text-lg">
              Search for anything from &ldquo;best sunset view&rdquo; to &ldquo;kid-friendly lunch&rdquo; in this community.
            </p>
            <form
              action="/search"
              method="GET"
              className="mx-auto flex w-full max-w-[600px] gap-2"
            >
              <input type="hidden" name="town_id" value={town.id} />
              <div className="relative flex-1 text-left">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-primary/40">
                  search
                </span>
                <input
                  name="q"
                  placeholder={`What are you looking for in ${town.name}?`}
                  className="h-14 w-full rounded-2xl border-none bg-white pl-14 pr-8 text-base text-on-surface shadow-premium-sm focus:ring-2 focus:ring-primary/10 transition-all"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="h-14 rounded-full bg-[var(--color-primary)] px-8 font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Go
              </button>
            </form>
          </section>

          {/* Adjacent Towns Footer */}
          {adjacent.length > 0 && (
            <div className="pt-20 border-t border-[var(--color-border-strong)]">
              <h3 className="font-headline text-xs font-extrabold tracking-widest text-[var(--color-text-tertiary)] uppercase mb-8 text-center">
                Neighboring Coastal Towns
              </h3>
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                {adjacent.map((t) => (
                  <Link 
                    key={t.slug} 
                    href={`/${t.slug}`}
                    className="text-lg font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all decoration-2 underline-offset-8 hover:underline"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
