import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { getPublishedContentEntryBySlug } from "@/lib/data/content-entries";

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
    // 1. Fetch Page
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
      .eq("status", "published")
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
  
  return {
    title: page.seo_title || `${page.title} | WhereTo30A`,
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

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <article className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">
          <section className="mb-14 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface-container-high)] shadow-premium-sm">
              {page.og_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.og_image_url}
                  alt={page.title}
                  className="aspect-[2/3] h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center text-[var(--color-text-tertiary)]">
                  <span className="material-symbols-outlined !text-5xl opacity-50" aria-hidden>
                    menu_book
                  </span>
                </div>
              )}
            </div>
            <header className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-premium-sm sm:p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                Guide
              </p>
              <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
                {page.title}
              </h1>
              {page.seo_description ? (
                <div className="mt-5 max-w-2xl">
                  <MarkdownRenderer
                    content={page.seo_description}
                    className="prose-p:text-lg prose-p:leading-relaxed prose-p:mb-3 prose-p:last:mb-0"
                  />
                </div>
              ) : null}
            </header>
          </section>

          <MarkdownRenderer content={page.body_markdown || ""} />
        </article>
      </main>
    </div>
  );
}
