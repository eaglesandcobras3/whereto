import Link from "next/link";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export type CategoryLeafHubLink = {
  title: string;
  slug: string;
  listingCount?: number;
};

type Props = {
  leaves: CategoryLeafHubLink[];
  title?: string;
  description?: string;
  analyticsCategory?: string;
};

/** Leaf category links for browse-group rollup hubs. */
export function BrowseGroupLeafLinks({
  leaves,
  title = "Browse by type",
  description = "Open a specific category hub for the full by-town listing grid.",
  analyticsCategory = "browse_group_leaf_link",
}: Props) {
  if (leaves.length === 0) return null;

  return (
    <section className="space-y-4 sm:space-y-6" aria-labelledby="browse-group-leaves-heading">
      <div>
        <h2
          id="browse-group-leaves-heading"
          className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl"
        >
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
          {description}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {leaves.map((leaf) => (
          <li key={leaf.slug}>
            <Link
              href={categoryHubPath(leaf.slug)}
              {...gaClickProps({
                event: "nav_click",
                category: analyticsCategory,
                label: leaf.slug,
              })}
              className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[var(--color-primary)]"
            >
              <span className="font-headline text-base font-semibold text-[var(--color-text-primary)]">
                {leaf.title}
              </span>
              {typeof leaf.listingCount === "number" ? (
                <span className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  {leaf.listingCount}{" "}
                  {leaf.listingCount === 1 ? "listing" : "listings"}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
