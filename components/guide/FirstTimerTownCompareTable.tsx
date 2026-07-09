import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { townPagePath } from "@/lib/routes/town-page-path";

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
    bestFor: "Friends weekends, date nights",
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
    <section className="mt-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-container-low)] p-6 sm:p-8" id="compare-towns">
      <header className="mb-6 max-w-2xl">
        <p className="text-eyebrow mb-3">Town comparison</p>
        <h2 className="text-editorial-headline text-2xl text-primary sm:text-3xl">
          Quick town comparison
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
          Use this table to narrow your home base, then open each town page for listings and local detail.
        </p>
      </header>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-container-low)]">
            <tr>
              <th className="px-5 py-3.5 font-semibold text-[var(--color-text-primary)]">Town</th>
              <th className="px-5 py-3.5 font-semibold text-[var(--color-text-primary)]">Vibe</th>
              <th className="px-5 py-3.5 font-semibold text-[var(--color-text-primary)]">Beach access</th>
              <th className="px-5 py-3.5 font-semibold text-[var(--color-text-primary)]">Best for</th>
            </tr>
          </thead>
          <tbody>
            {TOWN_COMPARE_ROWS.map((row) => (
              <tr key={row.slug} className="border-t border-[var(--color-border)]">
                <td className="px-5 py-3.5">
                  <Link
                    href={townPagePath(row.slug)}
                    {...gaClickProps({
                      event: "nav_click",
                      category: "first_timer_compare",
                      label: row.slug,
                    })}
                    className="font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    {row.town}
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{row.vibe}</td>
                <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{row.beachAccess}</td>
                <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{row.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {TOWN_COMPARE_ROWS.map((row) => (
          <li key={row.slug}>
            <Link
              href={townPagePath(row.slug)}
              {...gaClickProps({
                event: "nav_click",
                category: "first_timer_compare",
                label: row.slug,
              })}
              className="editorial-card block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm"
            >
              <span className="font-headline text-lg font-bold text-[var(--color-primary)]">
                {row.town}
              </span>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-[var(--color-text-primary)]">Vibe</dt>
                  <dd className="text-[var(--color-text-secondary)]">{row.vibe}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-primary)]">Beach access</dt>
                  <dd className="text-[var(--color-text-secondary)]">{row.beachAccess}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-primary)]">Best for</dt>
                  <dd className="text-[var(--color-text-secondary)]">{row.bestFor}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
