import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Props = { params: Promise<{ slug: string }> };

async function loadGuide(slug: string) {
  try {
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
    title: page.seo_title || `${page.title} — WhereTo30A`,
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
        <article className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24">
          <header className="mb-16">
            <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tighter text-[var(--color-text-primary)] mb-6">
              {page.title}
            </h1>
            {page.seo_description ? (
              <div className="max-w-3xl">
                <MarkdownRenderer
                  content={page.seo_description}
                  className="prose-p:text-xl prose-p:leading-relaxed prose-p:mb-3 prose-p:last:mb-0"
                />
              </div>
            ) : null}
          </header>

          {page.og_image_url && (
            <div className="mb-16 aspect-[21/9] w-full overflow-hidden rounded-[2.5rem] border border-[var(--color-border)] shadow-premium-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={page.og_image_url} 
                alt={page.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <MarkdownRenderer content={page.body_markdown || ""} />
        </article>
      </main>
    </div>
  );
}
