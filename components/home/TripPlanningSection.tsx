import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import {
  BEACH_ACCESS_PILLAR_GUIDE_PATH,
  PRIMARY_EDITORIAL_GUIDE_PATH,
} from "@/lib/seo/sitemap-strategy";

const PLANNING_LINKS = [
  {
    href: PRIMARY_EDITORIAL_GUIDE_PATH,
    label: "First-timer's guide to 30A",
    description: "Towns, airports, beach rules, and how to pace your week.",
    icon: "menu_book",
  },
  {
    href: BEACH_ACCESS_PILLAR_GUIDE_PATH,
    label: "30A beach access & parking",
    description: "Public access points and what to know before you hit the sand.",
    icon: "beach_access",
  },
  {
    href: "/towns",
    label: "Compare 30A beach towns",
    description: "Rosemary, Seaside, Alys, Grayton, and who each town fits best.",
    icon: "location_city",
  },
  {
    href: "/restaurants",
    label: "Restaurants on 30A",
    description: "Best places to eat by town, from brunch to date night.",
    icon: "restaurant",
  },
  {
    href: "/shopping",
    label: "Shopping on 30A",
    description: "Boutiques, town centers, and local stores along the corridor.",
    icon: "shopping_bag",
  },
  {
    href: "/guide/family-friendly-30a-beach-vacation",
    label: "Family vacation planning",
    description: "Kid-friendly towns, beaches, and what to book early.",
    icon: "family_restroom",
  },
] as const;

export function TripPlanningSection() {
  return (
    <section
      id="section-trip-planning"
      className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-20 md:py-28"
    >
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl md:mb-16">
          <p className="text-eyebrow mb-3">Plan your trip</p>
          <h2 className="text-editorial-headline text-4xl text-primary sm:text-5xl">
            Start planning your 30A trip
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
            Jump to the guides and hubs that answer the questions most visitors ask first:
            beach access, where to stay, which town fits your style, and where to eat.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNING_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              {...gaClickProps({
                event: "nav_click",
                category: "home_trip_planning",
                label: link.href,
              })}
              className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <span className="material-symbols-outlined">{link.icon}</span>
              </span>
              <div>
                <h3 className="font-headline text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                  {link.label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
