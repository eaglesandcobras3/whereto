import Link from "next/link";
import Image from "next/image";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import type { BrowseBusinessCard } from "@/lib/data/business-browse-cards";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { TruncatedList } from "@/components/ui/truncated-list";

type Props = {
  title: string;
  items: BrowseBusinessCard[];
  /** e.g. `mb-0` to align with a section that adds its own spacing */
  className?: string;
  /** GA4 delegated click **`event_category`** — identifies placement on the site */
  analyticsCategory?: string;
};

export function BusinessBrowseLinksList({
  title,
  items,
  className = "",
  analyticsCategory = "browse_business_list",
}: Props) {
  if (items.length === 0) return null;

  const list = (
    <ul className="space-y-3">
      {items.map((rb) => {
        const thumb = businessListingImageUrl(rb.hero_image_url);
        const blurb =
          (rb.ai_one_liner && rb.ai_one_liner.trim()) ||
          (rb.ai_summary && rb.ai_summary.slice(0, 100).trim()) ||
          null;
        return (
          <li key={rb.id}>
            <Link
              href={`/business/${rb.slug}`}
              {...gaClickProps({ event: "nav_click", category: analyticsCategory, label: rb.slug })}
              className="group flex gap-3 rounded-xl p-1 transition-colors hover:bg-[var(--color-surface-container-low)]"
            >
              {thumb ? (
                <Image
                  src={thumb}
                  alt={rb.name}
                  width={64}
                  height={96}
                  className="aspect-[2/3] w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                  <span className="material-symbols-outlined !text-xl">storefront</span>
                </div>
              )}
              <div className="min-w-0 flex-1 py-1">
                <p className="font-headline text-sm font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[var(--color-primary)]">
                  {rb.name}
                </p>
                {blurb && (
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-zinc-500">{blurb}</p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className={className}>
      <h2 className="text-eyebrow mb-4">{title}</h2>
      {items.length > 4 ? (
        <TruncatedList
          itemCount={items.length}
          label="places"
          maxHeight="20rem"
          fadeFrom="var(--color-surface)"
        >
          {list}
        </TruncatedList>
      ) : (
        list
      )}
    </section>
  );
}
