import Link from "next/link";
import Image from "next/image";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  name: string;
  slug: string;
  excerpt?: string | null;
  heroImageUrl?: string | null;
  meta?: string | null;
  analyticsCategory: string;
  analyticsLabel: string;
};

export function BusinessPreviewCard({
  name,
  slug,
  excerpt,
  heroImageUrl,
  meta,
  analyticsCategory,
  analyticsLabel,
}: Props) {
  const thumb = businessListingImageUrl(heroImageUrl ?? null);

  return (
    <Link
      href={`/business/${slug}`}
      {...gaClickProps({
        event: "nav_click",
        category: analyticsCategory,
        label: analyticsLabel,
      })}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/40 hover:shadow-md"
    >
      {thumb ? (
        <div className="relative aspect-[3/2] overflow-hidden">
          <Image
            src={thumb}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      ) : (
        <div className="flex aspect-[3/2] items-center justify-center bg-[var(--color-surface-container-high)] text-[var(--color-text-tertiary)]">
          <span className="material-symbols-outlined !text-4xl">storefront</span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-headline text-base font-bold leading-snug text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
          {name}
        </h3>
        {meta ? <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{meta}</p> : null}
        {excerpt ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {excerpt}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
