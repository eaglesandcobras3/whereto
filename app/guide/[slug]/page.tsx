import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { SeoImprovementsGate } from "@/components/feature-flags/SeoImprovementsGate";
import { CommunityTipsSection } from "@/components/community-tips/CommunityTipsSection";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { guideHeroGradient } from "@/lib/guides/hero-gradient";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";
import { getPublicImageUrl, getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { RelatedGuidesSection } from "@/components/seo/RelatedGuidesSection";
import { FirstTimerTownCompareTable } from "@/components/guide/FirstTimerTownCompareTable";
import { relatedGuidesForSlug } from "@/lib/seo/guide-related-links";
import { PRIMARY_EDITORIAL_GUIDE_SLUG } from "@/lib/seo/sitemap-strategy";
import { generateBreadcrumbSchema, generateGuideSchema } from "@/lib/seo/breadcrumb-schema";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { IrseAdminBadge } from "@/components/irse/IrseAdminBadge";
import { PageShareButton } from "@/components/share/PageShareButton";
import { ListingFieldFlagNote } from "@/components/business/ListingFieldFlagNote";
import { getAllFeatureFlags, isFeedbackFeatureEnabled } from "@/lib/feature-flags";

export const revalidate = 21600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { getServiceSupabase } = await import("@/lib/supabase/service-role");
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("guides")
    .select("slug")
    .is("archived_at", null)
    .eq("status", "published");
  return (data ?? [])
    .map((r) => ({ slug: String((r as { slug: string }).slug) }))
    .filter((r) => r.slug);
}

type Props = { params: Promise<{ slug: string }> };

async function loadGuide(slug: string) {
  try {
    const supabase = getServiceSupabase();

    const { data: g } = await supabase
      .from("guides")
      .select("id, title, content, excerpt, seo_title, seo_description, main_image, hero_image, main_image_url, hero_image_url, status, date_created, date_updated")
      .eq("slug", slug)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .maybeSingle();
    if (g) {
      const row = g as {
        id: string;
        title: string;
        content: string | null;
        excerpt: string | null;
        seo_title: string | null;
        seo_description: string | null;
        main_image: string | null;
        hero_image: string | null;
        main_image_url: string | null;
        hero_image_url: string | null;
        date_created: string | null;
        date_updated: string | null;
      };
      const img = getPublicImageUrlWithView(
        row.main_image_url,
        row.hero_image_url,
        row.main_image,
        row.hero_image,
      );

      const { data: bizLinks } = await supabase
        .from("guide_businesses")
        .select("business_id, businesses ( title, slug )")
        .eq("guide_id", row.id)
        .order("sort", { ascending: true, nullsFirst: false });

      const linkedBusinesses = (bizLinks ?? [])
        .map((link) => {
          const biz = (link as { businesses?: { title?: string; slug?: string } | null }).businesses;
          const bizSlug = biz?.slug?.trim();
          const title = biz?.title?.trim();
          if (!bizSlug || !title) return null;
          return { slug: bizSlug, title };
        })
        .filter((b): b is { slug: string; title: string } => Boolean(b));

      return {
        id: row.id,
        title: row.title,
        body_markdown: row.content ?? "",
        seo_title: row.seo_title,
        seo_description: row.seo_description ?? row.excerpt,
        og_image_url: img,
        date_published: row.date_created ?? null,
        date_modified: row.date_updated ?? null,
        linked_businesses: linkedBusinesses,
      };
    }

    const { data: page, error: pageErr } = await supabase
      .from("pages")
      .select(`
        title,
        body_markdown,
        seo_title,
        seo_description,
        og_image_url,
        page_type
      `)
      .eq("slug", slug)
      .maybeSingle();

    if (pageErr || !page) return null;
    return page;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadGuide(slug);
  if (!page) return { title: "Guide" };
  const seg = normalizeUrlSegment(slug);

  const ogTitle = page.seo_title || page.title;
  const ogDescription = metaDescriptionSnippet(
    page.seo_description,
    `Travel guide for 30A: ${page.title}.`,
  );

  return {
    ...canonicalAlternates(`/guide/${seg}`),
    title: seoTitleSegmentForLayout(page.seo_title || page.title),
    description: ogDescription,
    ...openGraphForPage({
      path: `/guide/${seg}`,
      title: ogTitle,
      description: ogDescription,
      imageUrl: page.og_image_url,
    }),
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const [page, flags] = await Promise.all([loadGuide(slug), getAllFeatureFlags()]);

  if (!page) notFound();

  const bodyMarkdown = stripLeadingH1MatchingTitle(page.body_markdown || "", page.title).trim();
  const hasHeroImage = Boolean(page.og_image_url);
  const lead = page.seo_description?.trim() || null;
  const showCorridorMap = slug === PRIMARY_EDITORIAL_GUIDE_SLUG;
  const relatedGuides = relatedGuidesForSlug(slug);
  const linkedBusinesses =
    "linked_businesses" in page && Array.isArray(page.linked_businesses)
      ? (page.linked_businesses as { slug: string; title: string }[])
      : [];
  const guideSeg = normalizeUrlSegment(slug);
  const guidePath = `/guide/${guideSeg}`;
  const guidePageId =
    "id" in page && typeof page.id === "string" ? page.id : null;
  const canFlagGuide = isFeedbackFeatureEnabled(flags) && Boolean(guidePageId);
  const shareButton = (
    <PageShareButton
      pageType="guide"
      pageName={page.title}
      pageSlug={guideSeg}
      pageId={guidePageId}
      path={guidePath}
    />
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Guides", url: "/guides" },
    { name: page.title, url: guidePath },
  ]);

  const guideSchema = generateGuideSchema({
    title: page.title,
    slug,
    description: page.seo_description,
    imageUrl: page.og_image_url,
    datePublished: (page as { date_published?: string | null }).date_published ?? undefined,
    dateModified: (page as { date_modified?: string | null }).date_modified ?? undefined,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <IrseAdminBadge kind="guide" slug={slug} />
      <main className="flex-1">
        {!hasHeroImage ? (
          <div className="coastal-hero border-b border-[var(--color-border)]">
            <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6 md:py-14">
              <nav
                className="mb-8 flex flex-wrap items-center gap-2 text-sm"
                aria-label="Breadcrumb"
              >
                <Link
                  href="/"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_breadcrumb",
                    label: "home",
                  })}
                  className="text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary)]"
                >
                  Home
                </Link>
                <span className="text-[var(--color-border-strong)]" aria-hidden>
                  /
                </span>
                <Link
                  href="/guides"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_breadcrumb",
                    label: "guides",
                  })}
                  className="text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary)]"
                >
                  Guides
                </Link>
              </nav>

              <div
                className={`mb-8 h-1 w-full rounded-full bg-gradient-to-r ${guideHeroGradient(slug)}`}
                aria-hidden
              />

              <header>
                <p className="text-eyebrow mb-3">Guide</p>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-editorial-headline min-w-0 flex-1 text-3xl text-[var(--color-text-primary)] sm:text-4xl lg:text-[2.75rem]">
                    {page.title}
                  </h1>
                  <div className="shrink-0 pt-1">{shareButton}</div>
                </div>
                {lead ? (
                  <p className="prose-editorial mt-6 max-w-2xl text-lg text-[var(--color-text-secondary)]">
                    {lead}
                  </p>
                ) : null}
                {linkedBusinesses.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {linkedBusinesses.map((b) => (
                      <Link
                        key={b.slug}
                        href={`/business/${b.slug}`}
                        {...gaClickProps({
                          event: "nav_click",
                          category: "guide_linked_business",
                          label: b.slug,
                        })}
                        className="inline-flex items-center rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                      >
                        {b.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
                {guidePageId && canFlagGuide ? (
                  <ListingFieldFlagNote entity="guide" entityId={guidePageId} field="content" />
                ) : null}
              </header>
            </div>
          </div>
        ) : null}

        <article
          className={`mx-auto max-w-3xl px-5 sm:px-6 ${
            hasHeroImage ? "py-10 md:py-14" : "pb-14 pt-10 md:pb-16 md:pt-12"
          }`}
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(guideSchema) }}
          />

          {hasHeroImage ? (
            <>
              <nav
                className="mb-8 flex flex-wrap items-center gap-2 text-sm"
                aria-label="Breadcrumb"
              >
                <Link
                  href="/"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_breadcrumb",
                    label: "home",
                  })}
                  className="text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary)]"
                >
                  Home
                </Link>
                <span className="text-[var(--color-border-strong)]" aria-hidden>
                  /
                </span>
                <Link
                  href="/guides"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_breadcrumb",
                    label: "guides",
                  })}
                  className="text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary)]"
                >
                  Guides
                </Link>
              </nav>

              <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl sm:aspect-[2/1]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.og_image_url!}
                  alt={page.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <p className="text-eyebrow mb-2 text-white/85">Guide</p>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <h1 className="text-editorial-headline min-w-0 flex-1 text-2xl text-white sm:text-3xl lg:text-4xl">
                      {page.title}
                    </h1>
                    <div className="shrink-0 [&_button]:border-white/35 [&_button]:bg-black/30 [&_button]:text-white [&_button]:hover:bg-black/45 [&_[role=menu]]:text-[var(--color-text-primary)]">
                      {shareButton}
                    </div>
                  </div>
                </div>
              </div>

              {lead ? (
                <p className="prose-editorial mb-10 text-lg text-[var(--color-text-secondary)]">
                  {lead}
                </p>
              ) : null}
              {linkedBusinesses.length > 0 ? (
                <div className={`${lead ? "-mt-6" : ""} mb-10 flex flex-wrap gap-1.5`}>
                  {linkedBusinesses.map((b) => (
                    <Link
                      key={b.slug}
                      href={`/business/${b.slug}`}
                      {...gaClickProps({
                        event: "nav_click",
                        category: "guide_linked_business",
                        label: b.slug,
                      })}
                      className="inline-flex items-center rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                    >
                      {b.title}
                    </Link>
                  ))}
                </div>
              ) : null}
              {guidePageId && canFlagGuide ? (
                <div className="mb-10">
                  <ListingFieldFlagNote entity="guide" entityId={guidePageId} field="content" />
                </div>
              ) : null}
            </>
          ) : null}

          {showCorridorMap ? (
            <figure className="mb-10">
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm">
                <Image
                  src="/map.jpeg"
                  alt="Map of beach towns along Scenic Highway 30A from Inlet Beach to Dune Allen"
                  width={1200}
                  height={600}
                  loading="lazy"
                  className="h-auto w-full"
                />
              </div>
              <figcaption className="mt-2 text-center text-xs text-[var(--color-text-tertiary)]">
                Beach towns along Scenic Highway 30A, east to west
              </figcaption>
            </figure>
          ) : null}

          <MarkdownRenderer content={bodyMarkdown} />
          {guidePageId && canFlagGuide ? (
            <div className="mt-8">
              <ListingFieldFlagNote entity="guide" entityId={guidePageId} field="content" />
            </div>
          ) : null}

          {showCorridorMap ? (
            <SeoImprovementsGate>
              <FirstTimerTownCompareTable />
            </SeoImprovementsGate>
          ) : null}

          <SeoImprovementsGate>
            <RelatedGuidesSection links={relatedGuides} analyticsCategory="guide_related" />
          </SeoImprovementsGate>

          {"id" in page && typeof page.id === "string" ? (
            <CommunityTipsSection
              entityType="guide"
              entityId={page.id}
              entityTitle={page.title}
            />
          ) : null}
        </article>
      </main>
    </div>
  );
}
