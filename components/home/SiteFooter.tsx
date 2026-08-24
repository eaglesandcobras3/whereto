import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getSiteInstagramUrl, getSiteTikTokUrl } from "@/lib/site-social";
import { getListedBusinessBrowseGroups } from "@/lib/data/business-browse-groups";
import { FooterCompanyLinks } from "@/components/home/FooterCompanyLinks";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { townPagePath } from "@/lib/routes/town-page-path";
import {
  AREAS_HUB_INCLUDE_OR_FILTER,
  TOWNS_HUB_INCLUDE_OR_FILTER,
} from "@/lib/places/hub-browse-visibility";

/** Footer browse lists generous cap — Supabase REST defaults elsewhere; avoids silent truncation surprises. */
const FOOTER_BROWSE_LIMIT = 500;

type FooterBrowseLink = { name: string; slug: string; href: string };

async function getBusinessCountsByColumn(column: "town_id" | "area_id" | "primary_category_id"): Promise<Map<string, number>> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("businesses_view")
    .select(column)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .limit(5000);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const id = (row as Record<string, unknown>)[column] as string | null;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

async function getFooterTowns(): Promise<FooterBrowseLink[]> {
  const supabase = getServiceSupabase();
  let townsRes = await supabase
    .from("towns")
    .select("id, title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(TOWNS_HUB_INCLUDE_OR_FILTER)
    .limit(FOOTER_BROWSE_LIMIT);
  if (townsRes.error?.message.includes("include_on_towns_hub")) {
    townsRes = await supabase
      .from("towns")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .limit(FOOTER_BROWSE_LIMIT);
  }
  const [{ data, error }, bizCounts] = await Promise.all([
    Promise.resolve(townsRes),
    getBusinessCountsByColumn("town_id"),
  ]);
  if (error) {
    console.error("SiteFooter getFooterTowns", error);
    return [];
  }
  const PINNED_TOWN_SLUGS = [
    "seaside",
    "rosemary-beach",
    "alys-beach",
    "watercolor",
    "watersound",
    "grayton-beach",
  ];
  const pinnedIndex = new Map(PINNED_TOWN_SLUGS.map((s, i) => [s, i]));

  return (data ?? [])
    .map((t) => ({
      name: (t as unknown as { title: string }).title,
      slug: t.slug as string,
      href: townPagePath(t.slug as string),
      _count: bizCounts.get(t.id as string) ?? 0,
    }))
    .sort((a, b) => {
      const aPin = pinnedIndex.get(a.slug);
      const bPin = pinnedIndex.get(b.slug);
      if (aPin != null && bPin != null) return aPin - bPin;
      if (aPin != null) return -1;
      if (bPin != null) return 1;
      return b._count - a._count || a.name.localeCompare(b.name);
    });
}

async function getFooterAreas(): Promise<FooterBrowseLink[]> {
  const supabase = getServiceSupabase();
  let areasRes = await supabase
    .from("areas_view")
    .select("id, title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(AREAS_HUB_INCLUDE_OR_FILTER)
    .limit(FOOTER_BROWSE_LIMIT);
  if (areasRes.error?.message.includes("include_in_site_browse")) {
    areasRes = await supabase
      .from("areas_view")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .limit(FOOTER_BROWSE_LIMIT);
  }
  const [{ data, error }, bizCounts] = await Promise.all([
    Promise.resolve(areasRes),
    getBusinessCountsByColumn("area_id"),
  ]);
  if (error) {
    console.error("SiteFooter getFooterAreas", error);
    return [];
  }
  return (data ?? [])
    .map((a) => ({
      name: (a as unknown as { title: string }).title,
      slug: a.slug as string,
      href: `/area/${a.slug as string}`,
      _count: bizCounts.get(a.id as string) ?? 0,
    }))
    .sort((a, b) => b._count - a._count || a.name.localeCompare(b.name));
}

async function getFooterBusinessBrowseGroups(): Promise<FooterBrowseLink[]> {
  const groups = await getListedBusinessBrowseGroups();
  const head: FooterBrowseLink[] = [{ name: "All businesses", slug: "all", href: "/businesses" }];
  return [
    ...head,
    ...groups.map((g) => ({
      name: g.title,
      slug: g.slug,
      href: g.href,
    })),
  ];
}

const footerLinkClass =
  "text-xs leading-snug text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]";

const footerCompactLinkClass =
  "text-[0.6875rem] leading-[1.35] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]";

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

/** Narrow link columns: Towns / Areas / Businesses / Company. */
const footerColumnsGridClass =
  "grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-x-8 xl:grid-cols-4 xl:gap-x-8";

const footerColumnClass = "min-w-0 w-full max-w-[10.5rem] sm:max-w-none xl:max-w-[9.5rem]";

function FooterBrowseColumn({
  title,
  links,
  analyticsCategory,
  compact = false,
}: {
  title: string;
  links: FooterBrowseLink[];
  analyticsCategory: string;
  compact?: boolean;
}) {
  return (
    <div className={footerColumnClass}>
      <h3 className={`text-eyebrow ${compact ? "mb-2" : "mb-3"}`}>{title}</h3>
      <ul className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"}`}>
        {links.map((item) => (
          <li key={item.slug}>
            <Link
              href={item.href}
              {...gaClickProps({
                event: "nav_click",
                category: analyticsCategory,
                label: item.slug,
              })}
              className={compact ? footerCompactLinkClass : footerLinkClass}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const getCachedFooterBrowseData = unstable_cache(
  async () => {
    const [townLinks, areaLinks, businessGroupLinks] = await Promise.all([
      getFooterTowns(),
      getFooterAreas(),
      getFooterBusinessBrowseGroups(),
    ]);
    return { townLinks, areaLinks, businessGroupLinks };
  },
  ["site-footer-browse-data-v6"],
  { revalidate: 3600 },
);

export async function SiteFooter() {
  const [{ townLinks, areaLinks, businessGroupLinks }, instagramUrl, tiktokUrl] =
    await Promise.all([
    getCachedFooterBrowseData(),
    Promise.resolve(getSiteInstagramUrl()),
    Promise.resolve(getSiteTikTokUrl()),
  ]);
  const browseSections = [
    townLinks.length > 0
      ? {
          title: "Towns",
          links: townLinks,
          analyticsCategory: "footer_towns",
          compact: true,
        }
      : null,
    areaLinks.length > 0
      ? {
          title: "Areas",
          links: areaLinks,
          analyticsCategory: "footer_areas",
          compact: true,
        }
      : null,
    businessGroupLinks.length > 0
      ? {
          title: "Businesses",
          links: businessGroupLinks,
          analyticsCategory: "footer_business_categories",
          compact: true,
        }
      : null,
  ].filter(Boolean) as {
    title: string;
    links: FooterBrowseLink[];
    analyticsCategory: string;
    compact?: boolean;
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
                src="/whereto30a.png"
                alt="WhereTo30A"
                className="h-7 w-auto md:h-8"
                width={320}
                height={79}
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
                <h3 className="text-eyebrow mb-2">Company</h3>
                <FooterCompanyLinks />
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
