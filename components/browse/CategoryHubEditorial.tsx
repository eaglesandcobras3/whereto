import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type EditorialBlock = {
  title: string;
  description: string;
  href?: string;
};

const CATEGORY_EDITORIAL: Record<string, EditorialBlock[]> = {
  restaurants: [
    {
      title: "Breakfast & brunch",
      description: "Start the day at local cafes and brunch spots before the beach crowds arrive.",
      href: "/restaurants",
    },
    {
      title: "Waterfront dining",
      description: "Gulf views and sunset dinners — compare options by town along the corridor.",
      href: "/restaurants",
    },
    {
      title: "Seafood & casual",
      description: "Fresh catch, tacos, and laid-back spots that define a 30A vacation week.",
      href: "/restaurants",
    },
    {
      title: "Date night",
      description: "Upscale reservations in Rosemary, Alys, and Seaside when you want a slower evening.",
      href: "/restaurants",
    },
  ],
  shopping: [
    {
      title: "Boutiques & gifts",
      description: "Independent shops for resort wear, home goods, and souvenirs you will actually use.",
      href: "/shopping",
    },
    {
      title: "Town centers",
      description: "Walkable shopping districts in Seaside, Rosemary, Alys, and Grayton.",
      href: "/areas",
    },
    {
      title: "Resort retail",
      description: "Convenience shopping tied to major communities and beach rentals.",
      href: "/shopping",
    },
  ],
};

type Props = {
  categorySlug: string;
};

export function CategoryHubEditorial({ categorySlug }: Props) {
  const blocks = CATEGORY_EDITORIAL[categorySlug];
  if (!blocks?.length) return null;

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-10">
      <div className="mx-auto max-w-6xl px-4 md:px-10">
        <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)] sm:text-xl">
          Browse by style
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Use these angles to narrow your search, then open listings by town below.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {blocks.map((block) => (
            <div
              key={block.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <h3 className="font-semibold text-[var(--color-text-primary)]">{block.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {block.description}
              </p>
              {block.href ? (
                <Link
                  href={block.href}
                  {...gaClickProps({
                    event: "nav_click",
                    category: "category_hub_editorial",
                    label: block.title,
                  })}
                  className="mt-2 inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Explore listings
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
