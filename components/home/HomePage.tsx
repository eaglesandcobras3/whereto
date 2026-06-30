"use client";

import Image from "next/image";
import Link from "next/link";
import { PRIMARY_EDITORIAL_GUIDE_PATH } from "@/lib/seo/sitemap-strategy";
import { isAskEnabled, isGuidesEnabled } from "@/lib/feature-flags-core";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { BusinessPayload } from "@/lib/search/types";
import { FeaturedBusinessesMasonry } from "@/components/home/FeaturedBusinessesMasonry";
import { ListBusinessHomeCta } from "@/components/home/ListBusinessHomeCta";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { HOME_HERO_IMAGE_PATH } from "@/lib/home/hero-image";

function MsIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={
        filled
          ? ({ fontVariationSettings: '"FILL" 1' } as React.CSSProperties)
          : undefined
      }
      aria-hidden
    >
      {name}
    </span>
  );
}

function DesignImg({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("http")}
    />
  );
}

type TownPayload = {
  name: string;
  slug: string;
  ai_tagline?: string | null;
  ai_description?: string | null;
  hero_image_url?: string | null;
};

function cleanTownBlurb(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/^a local'?s guide to [^.?!,]+[,.]?\s*/i, "")
    .replace(/^discover\s+/i, "")
    .trim();
}

function townBlurbFallback(townName: string): string {
  const fallbackByTown: Record<string, string> = {
    "Alys Beach":
      "Whitewashed architecture, quiet lanes, and upscale dining make this one of 30A's most polished beach towns.",
    "Rosemary Beach":
      "Cobblestone lanes, boutique shopping, and lively greens give Rosemary a walkable, European-style center.",
    "Grayton Beach":
      "An artsy beach town with local character, live music, and easy access to Grayton Beach State Park.",
    Seaside:
      "Colorful cottages, iconic town squares, and family-friendly beaches make Seaside a 30A classic.",
    WaterColor:
      "Resort amenities, dune lake access, and quiet neighborhoods create a relaxed, upscale coastal base.",
  };
  return (
    fallbackByTown[townName] ??
    `${townName} offers its own mix of beaches, dining, and local spots along Florida's Scenic Highway 30A.`
  );
}

function getTownCardBlurb(town: TownPayload): string {
  const preferred = cleanTownBlurb(town.ai_description) || cleanTownBlurb(town.ai_tagline);
  if (!preferred) return townBlurbFallback(town.name);
  return preferred.charAt(0).toUpperCase() + preferred.slice(1);
}

type Props = {
  featuredBusinesses?: (BusinessPayload & {
    featured_title?: string | null;
    featured_description?: string | null;
    badge?: string | null;
  })[];
  towns?: TownPayload[];
  heroSettings?: {
    imageUrl: string;
    title: string;
    subtitle: string;
  };
};

export function HomePage({
  featuredBusinesses = [],
  towns = [],
  heroSettings = {
    imageUrl: HOME_HERO_IMAGE_PATH,
    title: "Your local guide to 30A, Florida",
    subtitle:
      "From Rosemary Beach to Seaside and beyond, each town along Scenic Highway 30A has its own pace. Find where to eat, what to do, and the beach-access details worth knowing before you arrive.",
  },
}: Props) {
  const featureFlags = useAppFeatureFlags();

  return (
    <div className="min-h-screen bg-background font-body text-on-surface antialiased">
      <div>
        {/* Guide-first hero: same full-bleed image URL as the former search hero */}
        <section
          id="hero"
          className="relative flex min-h-[clamp(28rem,85vh,48rem)] w-full flex-col items-center justify-center"
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 img-editorial">
              <DesignImg
                src={heroSettings.imageUrl}
                alt="Watercolor illustration of 30A beach towns with sand paths, coastal architecture, and Gulf views"
                className="object-cover object-center"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-12 pt-8 sm:px-6 lg:px-8">
            <div className="home-hero-panel w-full max-w-3xl text-center lg:max-w-4xl">
              <h1 className="text-balance font-headline text-3xl font-extrabold leading-[1.08] tracking-tight text-primary sm:text-4xl md:text-5xl lg:text-[clamp(2.25rem,4vw,3.25rem)]">
                {heroSettings.title}
              </h1>

              <div className="home-hero-divider" aria-hidden="true" />

              <p className="w-full max-w-none text-base leading-relaxed text-on-surface/80 md:text-lg">
                {heroSettings.subtitle}
              </p>

              <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                {isGuidesEnabled(featureFlags) ? (
                  <Link
                    href={PRIMARY_EDITORIAL_GUIDE_PATH}
                    {...gaClickProps({ event: "cta_click", category: "home_hero", label: "explore_guide" })}
                    className="home-hero-cta"
                  >
                    <MsIcon name="menu_book" className="!text-xl" />
                    Explore the guide
                  </Link>
                ) : null}
                {isAskEnabled(featureFlags) ? (
                  <Link
                    href="/ask"
                    {...gaClickProps({ event: "cta_click", category: "home_hero", label: "ask_concierge" })}
                    className={isGuidesEnabled(featureFlags) ? "home-hero-cta-secondary" : "home-hero-cta"}
                  >
                    <MsIcon name="chat" className="!text-xl" />
                    Ask WhereTo30A
                  </Link>
                ) : (
                  <Link
                    href="/towns"
                    {...gaClickProps({ event: "cta_click", category: "home_hero", label: "browse_towns" })}
                    className="home-hero-cta"
                  >
                    Browse towns
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {featuredBusinesses.length > 0 && (
          <section id="section-featured" className="bg-background py-20 md:py-28">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
              <div className="mb-12 md:mb-16">
                <p className="text-eyebrow mb-3">Editor&apos;s Picks</p>
                <h2 className="text-editorial-headline text-4xl text-primary sm:text-5xl">
                  Featured Today
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
                  Restaurants, shops, and local spots we are highlighting across 30A.
                </p>
              </div>
              <FeaturedBusinessesMasonry businesses={featuredBusinesses} />
              <div className="mt-10 flex justify-center md:mt-12">
                <Link
                  href="/businesses"
                  {...gaClickProps({ event: "nav_click", category: "home_featured", label: "view_more_businesses" })}
                  className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-3.5 text-base font-semibold text-[var(--color-primary)] shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md"
                >
                  View more
                  <MsIcon
                    name="arrow_forward"
                    className="!text-lg transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </section>
        )}

        {towns.length > 0 && (
          <section
            id="section-neighborhoods"
            className="bg-surface-container-low py-20 md:py-28"
          >
            <div className="mx-auto max-w-screen-xl px-5 sm:px-6 lg:px-8">
              <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end md:mb-16">
                <div className="max-w-2xl">
                  <p className="text-eyebrow mb-3">Discover</p>
                  <h2 className="text-editorial-headline text-4xl text-primary sm:text-5xl">
                    Beach Towns of 30A
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
                    Rosemary feels different from Grayton, and Seaside from WaterColor. Compare the towns, then dive into local listings and guides.
                  </p>
                </div>
                <Link
                  href="/towns"
                  className="group flex items-center gap-2 font-semibold text-primary transition-all hover:gap-3"
                >
                  Explore all towns
                  <MsIcon name="arrow_forward" className="!text-lg transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                {towns.map((town) => (
                  <Link
                    key={town.slug}
                    href={`/${town.slug}`}
                    className="group editorial-card flex flex-row items-stretch gap-0 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                  >
                    <div className="relative aspect-[2/3] w-28 shrink-0 self-start bg-zinc-100 sm:w-32 md:w-36">
                      {town.hero_image_url ? (
                        <DesignImg
                          src={town.hero_image_url}
                          alt={town.name}
                          className="object-contain"
                          sizes="(min-width: 768px) 9rem, 7rem"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/35 to-primary/65" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:p-5">
                      <h3 className="font-headline text-xl font-bold leading-snug tracking-tight text-zinc-900 transition-colors group-hover:text-primary sm:text-2xl">
                        {town.name}
                      </h3>
                      <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600">
                        {getTownCardBlurb(town)}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary pt-1">
                        Explore
                        <MsIcon
                          name="arrow_forward"
                          className="!text-sm transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <ListBusinessHomeCta />
      </div>
    </div>
  );
}
