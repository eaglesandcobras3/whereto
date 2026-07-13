import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase, getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getPublicImageUrl, getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { TagPills } from "@/components/discovery/TagPills";
import { BusinessQuickFacts } from "@/components/business/BusinessQuickFacts";
import { BusinessProfileCollapsibleSections } from "@/components/business/BusinessProfileCollapsibleSections";
import { extractOverviewFromContent } from "@/lib/business/extract-overview";
import { normalizeSearchTags } from "@/lib/discovery-filters/search-tag-aggregate";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { getSimilarBusinesses } from "@/lib/data/business-browse-cards";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import { RelatedGuidesSection } from "@/components/seo/RelatedGuidesSection";
import type { RelatedGuideLink } from "@/lib/seo/guide-related-links";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import {
  businessListingTitleSegment,
  metaDescriptionSnippet,
} from "@/lib/seo/metadata-snippets";
import { businessListingIntro } from "@/lib/seo/page-intro-copy";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { generateBreadcrumbSchema, generateLocalBusinessSchema } from "@/lib/seo/breadcrumb-schema";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";
import { BusinessDirectoryDisclaimer } from "@/components/legal/BusinessDirectoryDisclaimer";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { townPagePath } from "@/lib/routes/town-page-path";
import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";
import { DiscoveryNavLink } from "@/components/feature-flags/DiscoveryNavLink";

export const revalidate = 21600;

/** Allow on-demand ISR for slugs not returned at build time (e.g. newly published). */
export const dynamicParams = true;

const STATIC_PARAMS_PAGE_SIZE = 1000;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const supabase = getServiceSupabase();
  const out: { slug: string }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses_view")
      .select("slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("id", { ascending: true })
      .range(from, from + STATIC_PARAMS_PAGE_SIZE - 1);
    if (error) {
      console.error("business generateStaticParams:", error);
      break;
    }
    const batch = data ?? [];
    for (const row of batch) {
      const slug = String((row as { slug: string }).slug ?? "").trim();
      if (slug) out.push({ slug });
    }
    if (batch.length < STATIC_PARAMS_PAGE_SIZE) break;
    from += STATIC_PARAMS_PAGE_SIZE;
  }
  return out;
}

type Props = { params: Promise<{ slug: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadBusiness(slug: string) {
  try {
    const supabase = getServiceSupabase();
    const isUuid = UUID_RE.test(slug);
    const sel = `
        id, slug, title, address, town_id, area_id, primary_category_id, map_lat, map_lng, phone, website,
        email, menu_url, booking_url, service_area, hours,
        excerpt, content, overview, main_image, hero_image, main_image_url, hero_image_url,
        review_rating_cached, review_count_cached,
        claim_status, search_tags, status, published_at, price_level,
        towns ( title, slug ),
        areas ( title, slug ),
        business_categories ( title, slug )
      `;

    const { data: business, error: bizErr } = isUuid
      ? await supabase
          .from("businesses_view")
          .select(sel)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
          .eq("id", slug)
          .maybeSingle()
      : await supabase
          .from("businesses_view")
          .select(sel)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
          .eq("slug", slug)
          .maybeSingle();

    if (bizErr || !business) return null;

    const row = business as Record<string, unknown> & {
      main_image_url?: string | null;
      hero_image_url?: string | null;
    };
    const img = getPublicImageUrlWithView(
      row.main_image_url,
      row.hero_image_url,
      row.main_image as string,
      row.hero_image as string,
    );
    const towns = row.towns as { title?: string; name?: string; slug?: string } | null;
    const category = row.business_categories as { title?: string; slug?: string } | null;

    const areasEmbed = row.areas as
      | { title?: string; slug?: string }
      | { title?: string; slug?: string }[]
      | null;
    const areasOne = areasEmbed && Array.isArray(areasEmbed) ? areasEmbed[0] : areasEmbed;
    let primary_area: { name: string; slug: string } | null =
      areasOne?.slug != null && String(areasOne.slug).trim()
        ? {
            name: (areasOne.title ?? "Area").trim() || "Area",
            slug: String(areasOne.slug).trim(),
          }
        : null;
    const rawAreaId = row.area_id as string | null | undefined;
    if (!primary_area && rawAreaId) {
      const { data: ar } = await supabase
        .from("areas_view")
        .select("title, slug")
        .eq("id", rawAreaId)
        .is("archived_at", null)
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .or(BROWSE_VISIBLE_NOT_HIDDEN)
        .maybeSingle();
      const a = ar as { title?: string; slug?: string } | null;
      if (a?.slug != null && String(a.slug).trim()) {
        primary_area = {
          name: (a.title ?? "Area").trim() || "Area",
          slug: String(a.slug).trim(),
        };
      }
    }
    if (!primary_area) {
      const { data: ab } = await supabase
        .from("area_businesses")
        .select("area_id")
        .eq("business_id", row.id as string)
        .order("sort", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      const jid = (ab as { area_id?: string } | null)?.area_id;
      if (jid) {
        const { data: ar } = await supabase
          .from("areas_view")
          .select("title, slug")
          .eq("id", jid)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
          .maybeSingle();
        const a = ar as { title?: string; slug?: string } | null;
        if (a?.slug != null && String(a.slug).trim()) {
          primary_area = {
            name: (a.title ?? "Area").trim() || "Area",
            slug: String(a.slug).trim(),
          };
        }
      }
    }

    return {
      ...row,
      name: (row.title as string) ?? "Business",
      lat: row.map_lat,
      lng: row.map_lng,
      has_physical_location: row.map_lat != null && row.map_lng != null,
      hero_image_url: img,
      ai_summary: (row.excerpt as string) ?? (typeof row.content === "string" ? row.content.slice(0, 500) : null),
      listing_rating: row.review_rating_cached,
      listing_review_count: row.review_count_cached,
      towns: towns ? { name: (towns as { title?: string }).title ?? towns.name, slug: towns.slug } : null,
      primary_area,
      categories: category
        ? {
            name: displayStorefrontCategoryTitle(
              category.slug ?? "",
              category.title ?? "Business",
            ),
            slug: category.slug,
          }
        : null,
      business_tags: null,
      pages: null,
      ai_vibe: null,
      ai_crowd: null,
      ai_noise_level: null,
      ai_best_time: null,
      ai_reservations: null,
      ai_parking: null,
      ai_wait_time: null,
      ai_good_for: null,
      ai_not_ideal_for: null,
      ai_pairs_with: null,
      ai_one_liner: (row.excerpt as string) ?? null,
      ai_local_tip: null,
      ai_highlights: null,
      ai_family_score: null,
      ai_date_score: null,
      ai_value_score: null,
    } as Record<string, unknown> & { pages: null };
  } catch (e) {
    console.error("loadBusiness error:", e);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await loadBusiness(slug);
  if (!b) return { title: "Business" };
  const descRaw = (b.excerpt as string) || (b.ai_summary as string) || "";
  const row = b as Record<string, unknown>;
  const rawSlug = row.slug;
  const dbSlug = typeof rawSlug === "string" ? rawSlug.trim() : "";
  const bizId = row.id != null ? String(row.id) : "";
  const canonicalSegment = dbSlug || bizId;
  const canonicalPath = `/business/${encodeURIComponent(canonicalSegment)}`;

  const metaTown = (b.towns as { name?: string } | null)?.name ?? null;
  const metaCategory = (b.categories as { name?: string } | null)?.name ?? null;
  const titleSuffix = [metaCategory, metaTown ? `in ${metaTown}` : null]
    .filter(Boolean)
    .join(" ");
  const pageTitle = businessListingTitleSegment(b.name as string, [titleSuffix || null]);
  const description = metaDescriptionSnippet(
    descRaw,
    `Local business on 30A: ${b.name as string}.`,
  );
  const ogTitle = `${b.name as string} | WhereTo30A`;

  return {
    ...canonicalAlternates(canonicalPath),
    title: pageTitle,
    description,
    ...openGraphForPage({
      path: canonicalPath,
      title: ogTitle,
      description,
      imageUrl: businessListingImageUrl(b.hero_image_url as string | null),
    }),
  };
}

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (!score) return null;
  const colors = [
    "bg-red-100 text-red-700",
    "bg-orange-100 text-orange-700",
    "bg-yellow-100 text-yellow-700",
    "bg-lime-100 text-lime-700",
    "bg-green-100 text-green-700",
  ];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${colors[score - 1]}`}>
        {score}
      </div>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const b = await loadBusiness(slug);
  if (!b) notFound();

  const row = b as Record<string, unknown>;
  const rawSlug = row.slug;
  const dbSlug = typeof rawSlug === "string" ? rawSlug.trim() : "";
  if (UUID_RE.test(slug) && dbSlug && slug !== dbSlug) {
    permanentRedirect(`/business/${encodeURIComponent(dbSlug)}`);
  }

  const supabase = getServiceSupabase();
  const townId = b.town_id as string | null;
  const businessId = b.id as string;

  type GuideCardRow = {
    slug: string;
    title: string;
    excerpt: string | null;
    og_image_url: string | null;
  };

  const relatedBusinesses = await getSimilarBusinesses({
    businessId,
    townId,
    primaryCategoryId: (b.primary_category_id as string | null) ?? null,
    limit: 6,
  });

  let townGuides: GuideCardRow[] = [];
  if (townId != null) {
    const { data: links } = await supabase
      .from("guide_towns")
      .select("guide_id")
      .eq("town_id", townId)
      .limit(20);
    const gids = (links ?? [])
      .map((l) => (l as { guide_id: string }).guide_id)
      .filter(Boolean);
    if (gids.length > 0) {
      const { data: gRows } = await supabase
        .from("guides")
        .select("slug, title, excerpt, main_image, hero_image")
        .in("id", gids)
        .is("archived_at", null)
        .or(BROWSE_VISIBLE_NOT_HIDDEN);
      townGuides =
        (gRows ?? []).map((g) => ({
          slug: g.slug,
          title: (g as { title: string }).title,
          excerpt: (g as { excerpt?: string | null }).excerpt ?? null,
          og_image_url:
            getPublicImageUrl((g as { main_image?: string | null }).main_image) ??
            getPublicImageUrl((g as { hero_image?: string | null }).hero_image),
        })) ?? [];
    }
  }
  if (townGuides.length === 0) {
    const { data: g2 } = await supabase
      .from("guides")
      .select("slug, title, excerpt, main_image, hero_image")
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("date_updated", { ascending: false, nullsFirst: false })
      .limit(5);
    townGuides =
      (g2 ?? []).map((g) => ({
        slug: g.slug,
        title: (g as { title: string }).title,
        excerpt: (g as { excerpt?: string | null }).excerpt ?? null,
        og_image_url:
          getPublicImageUrl((g as { main_image?: string | null }).main_image) ??
          getPublicImageUrl((g as { hero_image?: string | null }).hero_image),
      })) ?? [];
  }

  const town = b.towns as { name?: string; slug?: string } | null;
  const primaryArea = b.primary_area as { name: string; slug: string } | null;
  const category = b.categories as { name?: string; slug?: string } | null;
  const hasPhysicalLocation = Boolean(b.has_physical_location);
  const normalizedCategoryName = (category?.name ?? "").trim().toLowerCase();
  const breadcrumbCategoryLabel =
    hasPhysicalLocation && normalizedCategoryName === "services"
      ? "Business"
      : category?.name ?? null;
  const tagSlugs = normalizeSearchTags(b.search_tags);

  const heroImage = businessListingImageUrl(b.hero_image_url as string | null);
  const hasCoords = b.lat != null && b.lng != null;

  // AI enrichment data
  const vibe = b.ai_vibe as string[] | null;
  const crowd = b.ai_crowd as string[] | null;
  const noiseLevel = b.ai_noise_level as string | null;
  const bestTime = b.ai_best_time as string[] | null;
  const reservations = b.ai_reservations as string | null;
  const parking = b.ai_parking as string | null;
  const waitTime = b.ai_wait_time as string | null;
  const goodFor = b.ai_good_for as string[] | null;
  const notIdealFor = b.ai_not_ideal_for as string[] | null;
  const oneLiner = b.ai_one_liner as string | null;
  const localTip = b.ai_local_tip as string | null;
  const familyScore = b.ai_family_score as number | null;
  const dateScore = b.ai_date_score as number | null;
  const valueScore = b.ai_value_score as number | null;

  const bizId = row.id != null ? String(row.id) : "";
  const canonicalSegment = dbSlug || bizId;
  const canonicalPath = `/business/${encodeURIComponent(canonicalSegment)}`;

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    ...(town?.slug && town?.name ? [{ name: town.name, url: townPagePath(town.slug) }] : []),
    ...(breadcrumbCategoryLabel
      ? [
          {
            name: breadcrumbCategoryLabel,
            url: category?.slug
              ? categoryHubPath(category.slug)
              : "/categories",
          },
        ]
      : []),
    { name: b.name as string, url: canonicalPath },
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  const websiteHref = externalWebsiteHref(b.website as string | null);

  const priceLevel = b.price_level as number | null;
  const priceRange = priceLevel != null && priceLevel >= 1 && priceLevel <= 4
    ? "$".repeat(priceLevel)
    : null;

  const businessSchema = generateLocalBusinessSchema({
    name: b.name as string,
    slug: (b.slug as string) || (b.id as string),
    description: oneLiner || (b.ai_summary as string) || undefined,
    address: b.address as string | null,
    lat: b.lat as number | null,
    lng: b.lng as number | null,
    phone: b.phone as string | null,
    website: b.website as string | null,
    imageUrl: heroImage,
    townName: town?.name,
    townSlug: town?.slug,
    categoryName: category?.name,
    rating: b.listing_rating as number | null,
    reviewCount: b.listing_review_count as number | null,
    priceRange,
  });

  const overviewText =
    (typeof b.overview === "string" && b.overview.trim()) ||
    extractOverviewFromContent(
      typeof b.content === "string" ? b.content : null,
      b.name as string,
    ) ||
    "";
  const overviewParagraphs = overviewText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hasOverview = overviewParagraphs.length > 0;

  const relatedGuideLinks: RelatedGuideLink[] = townGuides.map((g) => ({
    slug: g.slug,
    title: g.title,
    href: g.slug === town?.slug ? townPagePath(g.slug) : `/guide/${g.slug}`,
    reason: g.excerpt?.trim() || undefined,
  }));

  const gaBiz = String(b.slug);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12 md:px-10">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
          />

          {/* Editorial Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm">
            <Link
              href="/"
              {...gaClickProps({
                event: "nav_click",
                category: "business_detail_breadcrumb",
                label: `${gaBiz}_home`,
              })}
              className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]"
            >
              Home
            </Link>
            {town?.slug && (
              <>
                <span className="text-zinc-300">/</span>
                <Link
                  href={townPagePath(town.slug)}
                  {...gaClickProps({
                    event: "nav_click",
                    category: "business_detail_breadcrumb",
                    label: `${gaBiz}_town_${town.slug}`,
                  })}
                  className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]"
                >
                  {town.name}
                </Link>
              </>
            )}
            {breadcrumbCategoryLabel && (
              <>
                <span className="text-zinc-300">/</span>
                {category?.slug ? (
                  <Link
                    href={categoryHubPath(category.slug)}
                    {...gaClickProps({
                      event: "nav_click",
                      category: "business_detail_breadcrumb",
                      label: `${gaBiz}_category_${category.slug}`,
                    })}
                    className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]"
                  >
                    {breadcrumbCategoryLabel}
                  </Link>
                ) : (
                  <span className="text-zinc-500">{breadcrumbCategoryLabel}</span>
                )}
              </>
            )}
          </nav>

          {/* Article Header - Horizontal layout with thumbnail */}
          <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Hero thumbnail — omit when no listing photo */}
            {heroImage ? (
              <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-40 md:w-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt={b.name as string}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            {/* Title and meta */}
            <div className="flex-1">
              <h1 className="text-editorial-headline text-3xl text-zinc-900 sm:text-4xl">
                {b.name as string}
              </h1>

              {/* Quick meta row */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                {town?.name && town?.slug && (
                  <Link
                    href={townPagePath(town.slug)}
                    {...gaClickProps({
                      event: "nav_click",
                      category: "business_detail_meta",
                      label: `${gaBiz}_town_pin`,
                    })}
                    className="flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
                  >
                    <span className="material-symbols-outlined !text-base">place</span>
                    {town.name}
                  </Link>
                )}
                {category?.name && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined !text-base">category</span>
                    {breadcrumbCategoryLabel ?? category.name}
                  </span>
                )}
              </div>

              {oneLiner ? (
                <p className="mt-4 text-lg leading-relaxed text-zinc-600">{oneLiner}</p>
              ) : null}
              {tagSlugs.length > 0 ? (
                <TagPills tags={tagSlugs} className="mt-3" />
              ) : null}
              {!hasOverview ? (
                <p className="prose-editorial mt-4 text-base leading-relaxed text-zinc-600">
                  {businessListingIntro(
                    b.name as string,
                    category?.name,
                    town?.name,
                  )}
                </p>
              ) : null}

              <BusinessQuickFacts
                address={b.address as string | null}
                email={(b.email as string | null) ?? null}
                phone={b.phone as string | null}
                website={b.website as string | null}
                menuUrl={(b.menu_url as string | null) ?? null}
                bookingUrl={(b.booking_url as string | null) ?? null}
                serviceArea={(b.service_area as string | null) ?? null}
                lat={b.lat as number | null}
                lng={b.lng as number | null}
                hours={(b.hours as unknown) ?? null}
              />

              {/* Score badges inline */}
              {(familyScore || dateScore || valueScore) && (
                <div className="mt-4 flex gap-5">
                  <ScoreBadge score={familyScore} label="Family" />
                  <ScoreBadge score={dateScore} label="Date Night" />
                  <ScoreBadge score={valueScore} label="Value" />
                </div>
              )}
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
            {/* Main Content */}
            <div className="space-y-4">
              {hasOverview ? (
                <div className="space-y-4">
                  {overviewParagraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-base leading-relaxed text-zinc-700 sm:text-lg"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}

              <BusinessDirectoryDisclaimer variant="flag" businessSlug={String(b.slug)} />

              <BusinessProfileCollapsibleSections
                vibe={vibe}
                aboutSummary={b.ai_summary ? String(b.ai_summary) : null}
                showAbout={!hasOverview}
                localTip={localTip}
                goodFor={goodFor}
                notIdealFor={notIdealFor}
              />
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">
              {/* At a Glance card */}
              {(reservations || parking || waitTime || noiseLevel || bestTime?.length || crowd?.length) ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h2 className="font-headline text-base font-bold text-zinc-900 mb-4">At a Glance</h2>
                  <dl className="space-y-3 text-sm">
                    {reservations && (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="flex items-center gap-2 text-zinc-500">
                          <span className="material-symbols-outlined !text-base">event_available</span>
                          Reservations
                        </dt>
                        <dd className="font-medium capitalize text-zinc-900">{reservations}</dd>
                      </div>
                    )}
                    {waitTime && (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="flex items-center gap-2 text-zinc-500">
                          <span className="material-symbols-outlined !text-base">schedule</span>
                          Wait time
                        </dt>
                        <dd className="font-medium text-zinc-900">{waitTime}</dd>
                      </div>
                    )}
                    {parking && (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="flex items-center gap-2 text-zinc-500">
                          <span className="material-symbols-outlined !text-base">local_parking</span>
                          Parking
                        </dt>
                        <dd className="font-medium capitalize text-zinc-900">{parking}</dd>
                      </div>
                    )}
                    {noiseLevel && (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="flex items-center gap-2 text-zinc-500">
                          <span className="material-symbols-outlined !text-base">volume_up</span>
                          Noise
                        </dt>
                        <dd className="font-medium capitalize text-zinc-900">{noiseLevel}</dd>
                      </div>
                    )}
                    {bestTime?.length ? (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="flex items-center gap-2 text-zinc-500">
                          <span className="material-symbols-outlined !text-base">wb_twilight</span>
                          Best time
                        </dt>
                        <dd className="font-medium text-right text-zinc-900">{bestTime.join(", ")}</dd>
                      </div>
                    ) : null}
                    {crowd?.length ? (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="flex items-center gap-2 text-zinc-500">
                          <span className="material-symbols-outlined !text-base">groups</span>
                          Crowd
                        </dt>
                        <dd className="font-medium text-right text-zinc-900">{crowd.join(", ")}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}

              {((town?.slug && town?.name) || primaryArea) && (
                <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h2 className="text-eyebrow mb-4">Town &amp; area</h2>
                  <ul className="space-y-2">
                    {town?.slug && town?.name ? (
                      <li>
                        <Link
                          href={townPagePath(town.slug)}
                          {...gaClickProps({
                            event: "nav_click",
                            category: "business_detail_sidebar",
                            label: `${gaBiz}_town_link`,
                          })}
                          className="group flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          <span className="material-symbols-outlined !text-base text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]">
                            place
                          </span>
                          {town.name}
                        </Link>
                      </li>
                    ) : null}
                    {primaryArea ? (
                      <li>
                        <Link
                          href={`/area/${primaryArea.slug}`}
                          {...gaClickProps({
                            event: "nav_click",
                            category: "business_detail_sidebar",
                            label: `${gaBiz}_area_${primaryArea.slug}`,
                          })}
                          className="group flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          <span className="material-symbols-outlined !text-base text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]">
                            explore
                          </span>
                          {primaryArea.name}
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                </section>
              )}
            </aside>
          </div>

          {(relatedBusinesses.length > 0 || relatedGuideLinks.length > 0) ? (
            <div className="mt-10 space-y-8 sm:mt-12 sm:space-y-10">
              {relatedBusinesses.length > 0 ? (
                <div className="space-y-4">
                  <PlaceRelatedSection
                    title={town?.name ? `Similar in ${town.name}` : "Similar places"}
                    description={
                      town?.name
                        ? `More spots near ${b.name as string} in ${town.name}.`
                        : `More spots like ${b.name as string}.`
                    }
                  >
                    {relatedBusinesses.map((rb) => (
                      <BusinessPreviewCard
                        key={rb.id}
                        name={rb.name}
                        slug={rb.slug}
                        excerpt={rb.ai_one_liner ?? rb.ai_summary}
                        heroImageUrl={rb.hero_image_url}
                        analyticsCategory={`business_similar_${gaBiz}`}
                        analyticsLabel={rb.slug}
                      />
                    ))}
                  </PlaceRelatedSection>
                  {townId ? (
                    <DiscoveryNavLink
                      params={{ town_id: townId }}
                      {...gaClickProps({
                        event: "nav_click",
                        category: "business_detail_related",
                        label: `${gaBiz}_view_more_town_search`,
                      })}
                      className="inline-flex text-sm font-medium text-[var(--color-primary)] transition-colors hover:underline"
                      aria-label={
                        town?.name
                          ? `View more businesses in ${town.name}`
                          : "View more businesses in this town"
                      }
                    >
                      View more
                    </DiscoveryNavLink>
                  ) : null}
                </div>
              ) : null}

              {relatedGuideLinks.length > 0 ? (
                <RelatedGuidesSection
                  title={
                    town?.name
                      ? `Guides for ${town.name}`
                      : "Guides & stories"
                  }
                  links={relatedGuideLinks}
                  analyticsCategory={`business_related_guides_${gaBiz}`}
                  collapsible={false}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
