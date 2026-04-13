import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Navbar } from "@/components/Navbar";
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
        page_type,
        entity_id
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    
    if (pageErr || !page) return null;

    // 2. Fetch Entity context if available
    let entityData = null;
    if (page.entity_id) {
      const { data: entity } = await supabase
        .from("entities")
        .select(`id, title, primary_town_id, towns(name, slug)`)
        .eq("id", page.entity_id)
        .maybeSingle();
      entityData = entity;
    }

    return { ...page, entities: entityData };
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

  const entity = page.entities as any;
  const town = entity?.towns as { name: string; slug: string } | null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Navbar compact />

      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24">
          {/* Breadcrumb */}
          <nav className="mb-12 flex items-center gap-2 text-sm font-medium text-[var(--color-text-tertiary)]">
            <Link href="/" className="hover:text-[var(--color-primary)]">Home</Link>
            <span className="material-symbols-outlined !text-xs opacity-30 text-zinc-300">chevron_right</span>
            {town && (
              <>
                <Link href={`/${town.slug}`} className="hover:text-[var(--color-primary)]">{town.name}</Link>
                <span className="material-symbols-outlined !text-xs opacity-30 text-zinc-300">chevron_right</span>
              </>
            )}
            <span className="text-[var(--color-text-secondary)]">Guide</span>
          </nav>

          <header className="mb-16">
            <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tighter text-[var(--color-text-primary)] mb-6">
              {page.title}
            </h1>
            {page.seo_description && (
              <p className="text-xl text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
                {page.seo_description}
              </p>
            )}
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

      <SiteFooter />
    </div>
  );
}
