import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { getPublishedContentEntryBySlug } from "@/lib/data/content-entries";
import { getPublicImageUrl } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { titleSegmentForLayoutTemplate } from "@/lib/seo/metadata-title";
import { generateBreadcrumbSchema, generateGuideSchema } from "@/lib/seo/breadcrumb-schema";

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
      };
    }

    const supabase = getServiceSupabase();

    const { data: g } = await supabase
      .from("guides")
      .select("title, content, excerpt, seo_title, seo_description, main_image, hero_image, status")
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
      };
      const img = getPublicImageUrl(row.main_image) ?? getPublicImageUrl(row.hero_image);
      return {
        title: row.title,
        body_markdown: row.content ?? "",
        seo_title: row.seo_title,
        seo_description: row.seo_description ?? row.excerpt,
        og_image_url: img,
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

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Guides", url: "/guide" },
    { name: page.title },
  ]);

  const guideSchema = generateGuideSchema({
    title: page.title,
    slug,
    description: page.seo_description,
    imageUrl: page.og_image_url,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <article className="mx-auto max-w-6xl px-5 py-12 sm:px-6 md:py-16 lg:px-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(guideSchema) }}
          />
          {/* Hero Section - Full width image with overlay */}
          {page.og_image_url && (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl sm:aspect-[21/9] lg:aspect-[3/1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.og_image_url}
                alt={page.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* Title overlay on image */}
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-12">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  Guide
                </p>
                <h1 className="text-editorial-headline max-w-4xl text-3xl text-white sm:text-4xl lg:text-5xl">
                  {page.title}
                </h1>
              </div>
            </div>
          )}

          {/* Article Header (when no image) */}
          {!page.og_image_url && (
            <header className="mb-10 max-w-3xl">
              <p className="text-eyebrow mb-3">Guide</p>
              <h1 className="text-editorial-headline text-4xl text-[var(--color-text-primary)] sm:text-5xl">
                {page.title}
              </h1>
              {page.seo_description && (
                <p className="mt-5 text-xl leading-relaxed text-[var(--color-text-secondary)]">
                  {page.seo_description}
                </p>
              )}
            </header>
          )}

          {/* Lead paragraph if we have image */}
          {page.og_image_url && page.seo_description && (
            <div className="mb-10 max-w-3xl">
              <p className="prose-editorial text-xl leading-relaxed text-[var(--color-text-secondary)]">
                {page.seo_description}
              </p>
            </div>
          )}

          {/* Article Body - Rich prose styling */}
          <div className="prose prose-lg prose-zinc mx-auto max-w-3xl prose-headings:font-headline prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h3:text-xl prose-p:leading-relaxed prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-blockquote:border-l-[var(--color-primary)] prose-blockquote:bg-[var(--color-surface-container-low)] prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic">
            <MarkdownRenderer content={page.body_markdown || ""} />
          </div>
        </article>
      </main>
    </div>
  );
}
