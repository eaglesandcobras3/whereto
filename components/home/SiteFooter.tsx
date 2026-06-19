import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getSiteInstagramUrl, getSiteTikTokUrl } from "@/lib/site-social";
import { PRIMARY_EDITORIAL_GUIDE_PATH } from "@/lib/seo/sitemap-strategy";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { getAllFeatureFlags, isOnboardEnabled } from "@/lib/feature-flags";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

/** Footer browse lists generous cap — Supabase REST defaults elsewhere; avoids silent truncation surprises. */
const FOOTER_BROWSE_LIMIT = 500;

type FooterBrowseLink = { name: string; slug: string };

async function getFooterTowns(): Promise<FooterBrowseLink[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("towns")
    .select("title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(FOOTER_BROWSE_LIMIT);
  if (error) {
    console.error("SiteFooter getFooterTowns", error);
    return [];
  }
  return (data ?? []).map((t) => ({
    name: (t as { title: string }).title,
    slug: t.slug as string,
  }));
}

async function getFooterAreas(): Promise<FooterBrowseLink[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("areas_view")
    .select("title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(FOOTER_BROWSE_LIMIT);
  if (error) {
    console.error("SiteFooter getFooterAreas", error);
    return [];
  }
  return (data ?? []).map((a) => ({
    name: (a as { title: string }).title,
    slug: a.slug as string,
  }));
}

async function getFooterCategories(): Promise<FooterBrowseLink[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("business_categories")
    .select("title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(FOOTER_BROWSE_LIMIT);
  if (error) {
    console.error("SiteFooter getFooterCategories", error);
    return [];
  }
  return (data ?? []).map((c) => ({
    name: (c as { title: string }).title,
    slug: c.slug as string,
  }));
}

const footerLinkClass =
  "text-xs leading-snug text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]";

const footerSocialButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-[1.125rem] w-[1.125rem]"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-[1.125rem] w-[1.125rem]"} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.5 3.5c.4 2.1 1.7 3.6 3.8 4.1v3.1c-1.4 0-2.7-.4-3.8-1.2v6.8c0 3.6-2.6 5.7-5.8 5.7-2.9 0-5.2-2.1-5.2-5.2 0-3.1 2.4-5.2 5.5-5.2.5 0 1 .1 1.4.2v3.3c-.4-.2-.9-.3-1.4-.3-1.5 0-2.6 1-2.6 2.4 0 1.4 1.1 2.4 2.6 2.4 1.7 0 2.7-1 2.7-3.1V3.5h3.8z" />
    </svg>
  );
}

function FooterSocialIcons({
  socials,
}: {
  socials: { id: "instagram" | "tiktok"; href: string; label: string }[];
}) {
  if (socials.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {socials.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          {...gaClickProps({
            event: "outbound_click",
            category: "footer_social",
            label: s.id,
          })}
          className={footerSocialButtonClass}
        >
          {s.id === "instagram" ? <InstagramIcon /> : <TikTokIcon />}
        </a>
      ))}
    </div>
  );
}

/** Narrow link columns: 1×4 stack → 2×2 → 4 across (brand stays left on lg+). */
const footerColumnsGridClass =
  "grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-x-8 xl:grid-cols-4 xl:gap-x-8";

const footerColumnClass = "min-w-0 w-full max-w-[10.5rem] sm:max-w-none xl:max-w-[9.5rem]";

function FooterBrowseColumn({
  title,
  links,
  hrefForSlug,
  analyticsCategory,
}: {
  title: string;
  links: FooterBrowseLink[];
  hrefForSlug: (slug: string) => string;
  analyticsCategory: string;
}) {
  return (
    <div className={footerColumnClass}>
      <h3 className="text-eyebrow mb-3">{title}</h3>
      <ul className="flex flex-col gap-1">
        {links.map((item) => (
          <li key={item.slug}>
            <Link
              href={hrefForSlug(item.slug)}
              {...gaClickProps({
                event: "nav_click",
                category: analyticsCategory,
                label: item.slug,
              })}
              className={footerLinkClass}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildCompanyLinks(listBusinessHref: string) {
  return [
  { ...gaClickProps({ event: "nav_click", category: "footer_company", label: "about" }), name: "About", href: "/about" },
  {
    ...gaClickProps({ event: "nav_click", category: "footer_company", label: "visitor_guide" }),
    name: "30A visitor guide",
    href: PRIMARY_EDITORIAL_GUIDE_PATH,
  },
  {
    ...gaClickProps({ event: "nav_click", category: "footer_company", label: "all_categories" }),
    name: "All categories",
    href: "/categories",
  },
  {
    ...gaClickProps({ event: "cta_click", category: "footer_company", label: "list_your_business" }),
    name: "List your business",
    href: listBusinessHref,
  },
  { ...gaClickProps({ event: "cta_click", category: "footer_company", label: "correct_listing" }), name: "Correct a listing", href: "/feedback" },
  { ...gaClickProps({ event: "nav_click", category: "footer_company", label: "privacy" }), name: "Privacy", href: "/privacy" },
  { ...gaClickProps({ event: "nav_click", category: "footer_company", label: "terms" }), name: "Terms", href: "/terms" },
];
}

export async function SiteFooter() {
  const flags = await getAllFeatureFlags();
  const listBusinessHref = isOnboardEnabled(flags) ? "/portal/businesses/new" : "/list-your-business";
  const companyLinks = buildCompanyLinks(listBusinessHref);

  const [townLinks, areaLinks, categoryLinks, instagramUrl, tiktokUrl] = await Promise.all([
    getFooterTowns(),
    getFooterAreas(),
    getFooterCategories(),
    Promise.resolve(getSiteInstagramUrl()),
    Promise.resolve(getSiteTikTokUrl()),
  ]);
  const browseSections = [
    townLinks.length > 0
      ? {
          title: "Towns",
          links: townLinks,
          hrefForSlug: (slug: string) => `/${slug}`,
          analyticsCategory: "footer_towns",
        }
      : null,
    areaLinks.length > 0
      ? {
          title: "Areas",
          links: areaLinks,
          hrefForSlug: (slug: string) => `/area/${slug}`,
          analyticsCategory: "footer_areas",
        }
      : null,
    categoryLinks.length > 0
      ? {
          title: "Categories",
          links: categoryLinks,
          hrefForSlug: (slug: string) => categoryHubPath(slug),
          analyticsCategory: "footer_categories",
        }
      : null,
  ].filter(Boolean) as {
    title: string;
    links: FooterBrowseLink[];
    hrefForSlug: (slug: string) => string;
    analyticsCategory: string;
  }[];
  const socials = [
    instagramUrl ? { id: "instagram" as const, label: "Instagram", href: instagramUrl } : null,
    tiktokUrl ? { id: "tiktok" as const, label: "TikTok", href: tiktokUrl } : null,
  ].filter(Boolean) as { id: "instagram" | "tiktok"; label: string; href: string }[];

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-site-chrome)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {/* Brand left; link columns 1×4 → 2×2 → 4 across */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-10 xl:gap-12">
          <div className="shrink-0 space-y-4 lg:w-48 xl:w-52">
            <div className="flex items-center gap-2">
              <img
                src="/whereto30a.svg"
                alt="WhereTo30A"
                className="h-7 w-auto md:h-8"
                width={737}
                height={182}
                decoding="async"
              />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--color-text-secondary)] lg:max-w-none">
              Your local guide to 30A and Florida&apos;s Emerald Coast.
              Curated listings, town guides, and hand-picked local favorites.
            </p>
            <FooterSocialIcons socials={socials} />
          </div>

          <div className={footerColumnsGridClass}>
            {browseSections.map((section) => (
              <FooterBrowseColumn key={section.title} {...section} />
            ))}

            <div className={`${footerColumnClass} flex flex-col gap-8`}>
              <div>
                <h3 className="text-eyebrow mb-3">Company</h3>
                <ul className="flex flex-col gap-1">
                  {companyLinks.map((link) => {
                    const { name, href, ...analytics } = link;
                    return (
                      <li key={href}>
                        <Link href={href} {...analytics} className={footerLinkClass}>
                          {name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
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
