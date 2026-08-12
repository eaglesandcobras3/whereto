import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type EditorialBlock = {
  title: string;
  description: string;
  href?: string;
  icon: string;
};

const CATEGORY_EDITORIAL: Record<string, EditorialBlock[]> = {
  restaurants: [
    {
      title: "Breakfast & brunch",
      description: "Start the day at local cafes and brunch spots before the beach crowds arrive.",
      href: "/restaurants",
      icon: "free_breakfast",
    },
    {
      title: "Waterfront dining",
      description: "Gulf views and sunset dinners — compare options by town along the corridor.",
      href: "/restaurants",
      icon: "water",
    },
    {
      title: "Seafood & casual",
      description: "Fresh catch, tacos, and laid-back spots that define a 30A vacation week.",
      href: "/restaurants",
      icon: "set_meal",
    },
    {
      title: "Date night",
      description: "Upscale reservations in Rosemary, Alys, and Seaside when you want a slower evening.",
      href: "/restaurants",
      icon: "wine_bar",
    },
  ],
  shopping: [
    {
      title: "Boutiques & gifts",
      description: "Independent shops for resort wear, home goods, and souvenirs you will actually use.",
      href: "/shopping",
      icon: "storefront",
    },
    {
      title: "Town centers",
      description: "Walkable shopping districts in Seaside, Rosemary, Alys, and Grayton.",
      href: "/areas",
      icon: "location_city",
    },
    {
      title: "Resort retail",
      description: "Convenience shopping tied to major communities and beach rentals.",
      href: "/shopping",
      icon: "shopping_bag",
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
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-10">
        <header className="mb-10 max-w-2xl md:mb-12">
          <p className="text-eyebrow mb-3">Browse by style</p>
          <h2 className="text-editorial-headline text-3xl text-primary sm:text-4xl">
            More ways to explore
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-text-secondary)]">
            Use these angles to narrow your search, then open listings by town above.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {blocks.map((block) => (
            <div
              key={block.title}
              className="editorial-card flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <span className="material-symbols-outlined">{block.icon}</span>
              </span>
              <div className="flex flex-1 flex-col">
                <h3 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
                  {block.title}
                </h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
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
                    className="group mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]"
                  >
                    <span className="underline-offset-2 group-hover:underline">Explore listings</span>
                    <span className="material-symbols-outlined !text-base">arrow_forward</span>
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
