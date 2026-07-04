import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

const TOWN_COMPARE_ROWS = [
  {
    town: "Seaside",
    slug: "seaside",
    vibe: "Walkable, family-friendly",
    beachAccess: "Short walk from center",
    bestFor: "First-timers, families",
  },
  {
    town: "Rosemary Beach",
    slug: "rosemary-beach",
    vibe: "European-style, boutique",
    beachAccess: "Walkable access points",
    bestFor: "Girls trips, date nights",
  },
  {
    town: "Grayton Beach",
    slug: "grayton-beach",
    vibe: "Laid-back, artsy",
    beachAccess: "State park nearby",
    bestFor: "Local character, music",
  },
  {
    town: "Alys Beach",
    slug: "alys-beach",
    vibe: "Upscale, architectural",
    beachAccess: "Quiet, polished",
    bestFor: "Luxury stays, photos",
  },
  {
    town: "Inlet Beach",
    slug: "inlet-beach",
    vibe: "Quiet, eastern 30A",
    beachAccess: "Wide beaches",
    bestFor: "Quieter weeks",
  },
] as const;

export function FirstTimerTownCompareTable() {
  return (
    <section className="mb-10" id="compare-towns">
      <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
        Quick town comparison
      </h2>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Use this table to narrow your home base, then open each town page for listings and local detail.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-container-low)]">
            <tr>
              <th className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">Town</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">Vibe</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">Beach access</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">Best for</th>
            </tr>
          </thead>
          <tbody>
            {TOWN_COMPARE_ROWS.map((row) => (
              <tr key={row.slug} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3">
                  <Link
                    href={`/${row.slug}`}
                    {...gaClickProps({
                      event: "nav_click",
                      category: "first_timer_compare",
                      label: row.slug,
                    })}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {row.town}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.vibe}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.beachAccess}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
