import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { getPublishedContentEntryBySlug } from "@/lib/data/content-entries";
import { guideHeroGradient } from "@/lib/guides/hero-gradient";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";
import { getPublicImageUrl } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { titleSegmentForLayoutTemplate } from "@/lib/seo/metadata-title";
import { generateBreadcrumbSchema, generateGuideSchema } from "@/lib/seo/breadcrumb-schema";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const { getServiceSupabaseOrNull } = await import("@/lib/supabase/service-role");
    const supabase = getServiceSupabaseOrNull();
    if (!supabase) return [];
    const { data } = await supabase
      .from("guides")
      .select("slug")
      .is("archived_at", null)
      .eq("status", "published");
    return (data ?? [])
      .map((r) => ({ slug: String((r as { slug: string }).slug) }))
      .filter((r) => r.slug);
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ slug: string }> };

async function loadGuide(slug: string) {
  try {
    const entry = await getPublishedContentEntryBySlug("guide", slug);
    if (entry) {
      return {
        title: entry.title,
        body_markdown: entry.body_markdown,
        seo_title: entry.seo_title,
        seo_description: entry.seo_description,
        og_image_url: entry.og_image_url,
        date_published: entry.published_at ?? null,
        date_modified: entry.updated_at ?? null,
      };
    }

    const supabase = getServiceSupabase();

    const { data: g } = await supabase
      .from("guides")
      .select("title, content, excerpt, seo_title, seo_description, main_image, hero_image, status, date_created, date_updated")
      .eq("slug", slug)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .maybeSingle();
    if (g) {
      const row = g as {
        title: string;
        content: string | null;
        excerpt: string | null;
        seo_title: string | null;
        seo_description: string | null;
        main_image: string | null;
        hero_image: string | null;
        date_created: string | null;
        date_updated: string | null;
      };
      const img = getPublicImageUrl(row.main_image) ?? getPublicImageUrl(row.hero_image);
      return {
        title: row.title,
        body_markdown: row.content ?? "",
        seo_title: row.seo_title,
        seo_description: row.seo_description ?? row.excerpt,
        og_image_url: img,
        date_published: row.date_created ?? null,
        date_modified: row.date_updated ?? null,
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

  return {
    ...canonicalAlternates(`/guide/${seg}`),
    title: titleSegmentForLayoutTemplate(page.seo_title || page.title),
    description: page.seo_description,
    openGraph: {
      title: page.seo_title || page.title,
      description: page.seo_description || undefined,
      images: page.og_image_url ? [{ url: page.og_image_url }] : [],
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const page = await loadGuide(slug);

  if (!page) notFound();

  const bodyMarkdown = stripLeadingH1MatchingTitle(page.body_markdown || "", page.title).trim();
  const hasHeroImage = Boolean(page.og_image_url);
  const lead = page.seo_description?.trim() || null;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Guides", url: "/guides" },
    { name: page.title },
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
                <h1 className="text-editorial-headline text-3xl text-[var(--color-text-primary)] sm:text-4xl lg:text-[2.75rem]">
                  {page.title}
                </h1>
                {lead ? (
                  <p className="prose-editorial mt-6 max-w-2xl text-lg text-[var(--color-text-secondary)]">
                    {lead}
                  </p>
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
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <p className="text-eyebrow mb-2 text-white/85">Guide</p>
                  <h1 className="text-editorial-headline text-2xl text-white sm:text-3xl lg:text-4xl">
                    {page.title}
                  </h1>
                </div>
              </div>

              {lead ? (
                <p className="prose-editorial mb-10 text-lg text-[var(--color-text-secondary)]">
                  {lead}
                </p>
              ) : null}
            </>
          ) : null}

          <MarkdownRenderer content={bodyMarkdown} />
        </article>
      </main>
    </div>
  );
}
