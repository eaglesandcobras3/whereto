import Link from "next/link";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getSiteInstagramUrl, getSiteTikTokUrl } from "@/lib/site-social";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

/** Footer town list generous cap — Supabase REST defaults elsewhere; avoids silent truncation surprises. */
const FOOTER_TOWNS_LIMIT = 500;

async function getFooterTowns(): Promise<{ name: string; slug: string }[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("towns")
    .select("title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(FOOTER_TOWNS_LIMIT);
  if (error) {
    console.error("SiteFooter getFooterTowns", error);
    return [];
  }
  return (data ?? []).map((t) => ({
    name: (t as { title: string }).title,
    slug: t.slug as string,
  }));
}

const companyLinks = [
  { ...gaClickProps({ event: "nav_click", category: "footer_company", label: "about" }), name: "About", href: "/about" },
  {
    ...gaClickProps({ event: "cta_click", category: "footer_company", label: "list_your_business" }),
    name: "List your business",
    href: "/list-your-business",
  },
  { ...gaClickProps({ event: "cta_click", category: "footer_company", label: "correct_listing" }), name: "Correct a listing", href: "/feedback" },
  { ...gaClickProps({ event: "nav_click", category: "footer_company", label: "privacy" }), name: "Privacy", href: "/privacy" },
  { ...gaClickProps({ event: "nav_click", category: "footer_company", label: "terms" }), name: "Terms", href: "/terms" },
];

export async function SiteFooter() {
  const [flags, townLinks, instagramUrl, tiktokUrl] = await Promise.all([
    getAllFeatureFlags(),
    getFooterTowns(),
    Promise.resolve(getSiteInstagramUrl()),
    Promise.resolve(getSiteTikTokUrl()),
  ]);
  const showTowns = townLinks.length > 0;
  const socials = [
    instagramUrl ? { label: "Instagram", href: instagramUrl } : null,
    tiktokUrl ? { label: "TikTok", href: tiktokUrl } : null,
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-site-chrome)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {/* Main footer content */}
        <div className={`grid gap-10 sm:gap-12 ${showTowns ? "lg:grid-cols-[1fr_1fr_1fr]" : "lg:grid-cols-2"}`}>
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src="/whereto30a.svg"
                alt="WhereTo30A"
                className="h-10 w-auto md:h-12"
                width={1384}
                height={627}
                decoding="async"
              />
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Your local guide to 30A and Florida&apos;s Emerald Coast.
              Curated listings, town guides, and hand-picked local favorites.
            </p>
          </div>

          {showTowns ? (
            <div>
              <h3 className="text-eyebrow mb-4">Towns</h3>
              <ul className="flex flex-col gap-2">
                {townLinks.map((town) => (
                  <li key={town.slug}>
                    <Link
                      href={`/${town.slug}`}
                      {...gaClickProps({
                        event: "nav_click",
                        category: "footer_towns",
                        label: town.slug,
                      })}
                      className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                    >
                      {town.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Newsletter + Company (stacked) */}
          <div className="flex flex-col gap-8">
            {flags["newsletter"] === true && (
              <div>
                <h3 className="text-eyebrow mb-4">Stay updated</h3>
                <p className="mb-3 text-sm text-[var(--color-text-secondary)]">Get the best local picks in your inbox.</p>
                <form className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    className="flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                  <button
                    type="submit"
                    {...gaClickProps({ event: "cta_click", category: "footer_newsletter", label: "join" })}
                    className="shrink-0 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-light)]"
                  >
                    Join
                  </button>
                </form>
              </div>
            )}

            <div>
              <h3 className="text-eyebrow mb-3">Company</h3>
              <ul className="flex flex-col gap-2">
                {companyLinks.map((link) => {
                  const { name, href, ...analytics } = link;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        {...analytics}
                        className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {name}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {socials.length > 0 ? (
                <div className="mt-6">
                  <h4 className="text-eyebrow mb-2 text-[var(--color-text-tertiary)]">Social</h4>
                  <ul className="flex flex-col gap-2">
                    {socials.map((s) => (
                      <li key={s.href}>
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...gaClickProps({
                            event: "outbound_click",
                            category: "footer_social",
                            label: s.label.toLowerCase(),
                          })}
                          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                        >
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--color-border)] pt-8">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            © {new Date().getFullYear()} WhereTo30A ·{" "}
            <Link
              href="/terms"
              {...gaClickProps({ event: "nav_click", category: "footer_legal_row", label: "terms" })}
              className="underline-offset-4 hover:text-[var(--color-text-secondary)] hover:underline"
            >
              Terms
            </Link>
            {" · "}
            <Link
              href="/privacy"
              {...gaClickProps({ event: "nav_click", category: "footer_legal_row", label: "privacy" })}
              className="underline-offset-4 hover:text-[var(--color-text-secondary)] hover:underline"
            >
              Privacy
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
