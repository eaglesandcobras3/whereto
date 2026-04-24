import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPlaceBySlug } from "@/lib/data/public-place-by-slug";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPublicPlaceBySlug(slug);
  if (!place) return { title: "Area | WhereTo30A" };
  return {
    title: `${place.title} | WhereTo30A`,
    description: place.excerpt || `Explore ${place.title} on 30A.`,
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = await getPublicPlaceBySlug(slug);

  if (!area) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Hero */}
      {area.hero_image_url && (
        <div className="relative h-64 w-full overflow-hidden bg-[var(--color-surface-secondary)] sm:h-80 lg:h-96">
          <img
            src={area.hero_image_url}
            alt={area.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="mx-auto max-w-4xl">
              {area.town_name && area.town_slug && (
                <Link
                  href={`/${area.town_slug}`}
                  className="mb-2 inline-block text-sm font-medium text-white/80 hover:text-white"
                >
                  {area.town_name}
                </Link>
              )}
              <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {area.title}
              </h1>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {!area.hero_image_url && (
          <>
            {area.town_name && area.town_slug && (
              <Link
                href={`/${area.town_slug}`}
                className="mb-2 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                &larr; {area.town_name}
              </Link>
            )}
            <h1 className="mb-4 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
              {area.title}
            </h1>
          </>
        )}

        {area.areaTypeLabel && (
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            {area.areaTypeLabel.replace(/_/g, " ")}
          </p>
        )}

        {area.excerpt && (
          <p className="mb-6 text-lg leading-relaxed text-[var(--color-text-secondary)]">
            {area.excerpt}
          </p>
        )}

        {area.content && (
          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer content={area.content} />
          </div>
        )}

        {area.town_slug && area.town_name && (
          <div className="mt-8 border-t border-[var(--color-border)] pt-6">
            <Link
              href={`/${area.town_slug}`}
              className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Explore more of {area.town_name}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
