import Link from "next/link";
import { HomePortraitScroll } from "@/components/home/HomePortraitScroll";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import type { HomePortraitItem } from "@/lib/home/homepage-portrait";

export type HomeGuideCard = {
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image_url: string | null;
  eyebrow: string | null;
};

type Props = {
  guides: HomeGuideCard[];
};

export function HomeGuidesSection({ guides }: Props) {
  if (guides.length === 0) return null;

  const items: HomePortraitItem[] = guides.map((g) => ({
    href: `/guide/${g.slug}`,
    title: g.title,
    excerpt: g.excerpt,
    imageUrl: g.hero_image_url,
    eyebrow: g.eyebrow,
    ctaLabel: "Explore",
    analyticsCategory: "homepage_guides",
    analyticsLabel: g.slug,
  }));

  return (
    <section id="section-guides" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
        <div className="mb-12 md:mb-16">
          <p className="text-eyebrow mb-3">Guides</p>
          <h2
            id="home-guides-heading"
            className="text-editorial-headline text-4xl text-primary sm:text-5xl"
          >
            Travel Guides
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
            Explore practical guides to 30A&apos;s towns, beaches, dining, things to
            do, and the details that make planning your trip easier.
          </p>
        </div>
        <HomePortraitScroll items={items} labelledBy="home-guides-heading" />
        <Link
          href="/guides"
          {...gaClickProps({
            event: "nav_click",
            category: "homepage_guides",
            label: "all_guides",
          })}
          className="group mt-8 inline-flex items-center gap-2 font-semibold text-primary"
        >
          All guides
          <span
            className="material-symbols-outlined !text-lg transition-transform group-hover:translate-x-1"
            aria-hidden
          >
            arrow_forward
          </span>
        </Link>
      </div>
    </section>
  );
}
