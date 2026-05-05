import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getPublicImageUrl, getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { TagPills } from "@/components/discovery/TagPills";
import { ClaimListingForm } from "@/components/ClaimListingForm";
import { getAllFeatureFlags, isAuthEnabled } from "@/lib/feature-flags";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";
import { selectBusinessHighlights } from "@/lib/business/highlights";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { getSimilarBusinesses } from "@/lib/data/business-browse-cards";
import { BusinessBrowseLinksList } from "@/components/discovery/BusinessBrowseLinksList";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { generateBreadcrumbSchema, generateLocalBusinessSchema } from "@/lib/seo/breadcrumb-schema";

type Props = { params: Promise<{ slug: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function intentTagsToFakeTagRows(
  raw: unknown,
): { tags: { slug: string; name: string } | null }[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => {
      if (typeof t === "string")
        return { tags: { slug: t, name: t } };
      if (t && typeof t === "object" && "slug" in t) {
        const o = t as { slug?: string; name?: string };
        return { tags: { slug: o.slug ?? "tag", name: o.name ?? o.slug ?? "Tag" } };
      }
      return { tags: null };
    });
  }
  return [];
}

async function loadBusiness(slug: string) {
  try {
    const supabase = getServiceSupabase();
    const isUuid = UUID_RE.test(slug);
    const sel = `
        id, slug, title, address, town_id, primary_category_id, map_lat, map_lng, phone, website,
        excerpt, content, main_image, hero_image, main_image_url, hero_image_url,
        review_rating_cached, review_count_cached,
        claim_status, intent_tags, status, published_at,
        towns ( title, slug ),
        business_categories ( title, slug )
      `;

    const { data: business, error: bizErr } = isUuid
      ? await supabase
          .from("businesses_view")
          .select(sel)
          .is("archived_at", null)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
          .eq("id", slug)
          .maybeSingle()
      : await supabase
          .from("businesses_view")
          .select(sel)
          .is("archived_at", null)
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
      categories: category ? { name: category.title, slug: category.slug } : null,
      business_tags: intentTagsToFakeTagRows(row.intent_tags),
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
  const desc = (b.excerpt as string) || (b.ai_summary as string)?.slice(0, 160) || undefined;
  const hero = businessListingImageUrl(b.hero_image_url as string | null);
  const ogUrl = hero ?? undefined;
  const row = b as Record<string, unknown>;
  const rawSlug = row.slug;
  const dbSlug = typeof rawSlug === "string" ? rawSlug.trim() : "";
  const bizId = row.id != null ? String(row.id) : "";
  const canonicalSegment = dbSlug || bizId;
  const canonicalPath = `/business/${encodeURIComponent(canonicalSegment)}`;
  return {
    ...canonicalAlternates(canonicalPath),
    title: `${b.name as string} | WhereTo30A`,
    description: desc,
    openGraph: ogUrl
      ? { title: `${b.name as string} | WhereTo30A`, description: desc, images: [{ url: ogUrl }] }
      : { title: `${b.name as string} | WhereTo30A`, description: desc },
    twitter: ogUrl
      ? { card: "summary_large_image", description: desc, images: [ogUrl] }
      : { card: "summary", description: desc },
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

function highlightIconName(label: string): string {
  const normalized = label.trim().toLowerCase();
  const iconMap: Record<string, string> = {
    family: "family_restroom",
    "kid-friendly": "child_friendly",
    "kid friendly": "child_friendly",
    "pet-friendly": "pets",
    "pet friendly": "pets",
    casual: "deck",
    upscale: "diamond",
    "outdoor seating": "deck",
    waterfront: "water",
    "sunset views": "wb_twilight",
    "date night": "favorite",
    "live music": "music_note",
    "quick bite": "lunch_dining",
    brunch: "brunch_dining",
    breakfast: "free_breakfast",
    dinner: "dinner_dining",
    groups: "groups",
  };
  return iconMap[normalized] ?? "check_circle";
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

  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  const flags = await getAllFeatureFlags();
  const authEnabled = isAuthEnabled(flags);
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
    limit: 5,
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
  const category = b.categories as { name?: string; slug?: string } | null;
  const hasPhysicalLocation = Boolean(b.has_physical_location);
  const normalizedCategoryName = (category?.name ?? "").trim().toLowerCase();
  const breadcrumbCategoryLabel =
    hasPhysicalLocation && normalizedCategoryName === "services"
      ? "Business"
      : category?.name ?? null;
  const tagRows = b.business_tags as
    | { tags: { slug?: string; name?: string } | null }[]
    | null;
  const tagItems: Array<{ slug?: string | null; name?: string | null }> = [];
  for (const row of tagRows ?? []) {
    const t = row.tags;
    if (t && typeof t === "object") {
      tagItems.push({
        slug: "slug" in t ? (t.slug ?? null) : null,
        name: "name" in t ? (t.name ?? null) : null,
      });
    }
  }
  const tagSlugs = tagItems
    .map((tag) => tag.slug?.trim())
    .filter((slug): slug is string => Boolean(slug));

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
  const highlights = b.ai_highlights as string[] | null;
  const displayHighlights = selectBusinessHighlights({
    aiHighlights: highlights,
    tags: tagItems,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    max: 6,
  });
  const familyScore = b.ai_family_score as number | null;
  const dateScore = b.ai_date_score as number | null;
  const valueScore = b.ai_value_score as number | null;

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    ...(town?.slug && town?.name ? [{ name: town.name, url: `/${town.slug}` }] : []),
    ...(breadcrumbCategoryLabel ? [{ name: breadcrumbCategoryLabel }] : []),
    { name: b.name as string },
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

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
  });

  const fromContent = typeof b.content === "string" && b.content.trim() ? b.content.trim() : "";
  const fromPages = (b.pages as { body_markdown?: string } | null)?.body_markdown?.trim() ?? "";
  const rawMarkdown = fromContent || fromPages;
  const cleanedMarkdown = rawMarkdown
    ? stripLeadingH1MatchingTitle(rawMarkdown, b.name as string).trim()
    : "";
  const hasMarkdown = cleanedMarkdown.length > 0;

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
            <Link href="/" className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]">Home</Link>
            {town?.slug && (
              <>
                <span className="text-zinc-300">/</span>
                <Link href={`/${town.slug}`} className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]">{town.name}</Link>
              </>
            )}
            {breadcrumbCategoryLabel && (
              <>
                <span className="text-zinc-300">/</span>
                <span className="text-zinc-500">{breadcrumbCategoryLabel}</span>
              </>
            )}
          </nav>

          {/* Article Header - Horizontal layout with thumbnail */}
          <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Hero thumbnail */}
            <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-40 md:w-48">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={b.name as string}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  <span className="material-symbols-outlined !text-4xl" aria-hidden>
                    storefront
                  </span>
                </div>
              )}
            </div>

            {/* Title and meta */}
            <div className="flex-1">
              <h1 className="text-editorial-headline text-3xl text-zinc-900 sm:text-4xl">
                {b.name as string}
              </h1>

              {/* Quick meta row */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                {town?.name && (
                  <Link href={`/${town.slug}`} className="flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]">
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

              {displayHighlights.length > 0 ? (
                <div className="mt-5 rounded-2xl bg-[var(--color-surface-container-low)] p-4 sm:p-5">
                  <h2 className="font-headline text-lg font-bold text-zinc-900 mb-3">Highlights</h2>
                  <ul className="grid gap-2 sm:grid-cols-2 sm:gap-x-6">
                    {displayHighlights.map((h) => (
                      <li key={h} className="flex items-center gap-2.5 text-zinc-700">
                        <span className="material-symbols-outlined !text-[18px] text-[var(--color-primary)]">
                          {highlightIconName(h)}
                        </span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {oneLiner && (
                <p className="mt-4 text-lg leading-relaxed text-zinc-600">{oneLiner}</p>
              )}

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
            <div className="space-y-8">

              {hasMarkdown ? <MarkdownRenderer content={cleanedMarkdown} /> : null}

              {/* Vibe Tags - Editorial badges */}
              {vibe?.length ? (
                <div>
                  <h2 className="text-eyebrow mb-4">The Vibe</h2>
                  <div className="flex flex-wrap gap-2">
                    {vibe.map((v) => (
                      <span key={v} className="editorial-chip">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* About - prose style */}
              {!hasMarkdown && b.ai_summary ? (
                <div>
                  <h2 className="text-eyebrow mb-4">About</h2>
                  <p className="prose-editorial text-zinc-700">{b.ai_summary as string}</p>
                </div>
              ) : null}

              {/* Local Tip - Pull quote style */}
              {localTip && (
                <div className="pull-quote">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">Local Tip</p>
                  <p className="text-lg leading-relaxed">{localTip}</p>
                </div>
              )}

              {/* Good For / Skip If - Two column layout */}
              {(goodFor?.length || notIdealFor?.length) ? (
                <div className="grid gap-8 sm:grid-cols-2">
                  {goodFor?.length ? (
                    <div>
                      <h2 className="text-eyebrow mb-4">Great For</h2>
                      <ul className="space-y-2.5">
                        {goodFor.map((g) => (
                          <li key={g} className="flex items-center gap-2.5 text-zinc-700">
                            <span className="text-green-600 material-symbols-outlined !text-base">check_circle</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {notIdealFor?.length ? (
                    <div>
                      <h2 className="text-eyebrow mb-4">Skip If</h2>
                      <ul className="space-y-2.5">
                        {notIdealFor.map((n) => (
                          <li key={n} className="flex items-center gap-2.5 text-zinc-500">
                            <span className="text-zinc-300 material-symbols-outlined !text-base">remove_circle</span>
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Tags - linked for SEO */}
              {tagSlugs.length > 0 && (
                <div>
                  <h2 className="text-eyebrow mb-4">Tags</h2>
                  <TagPills tags={tagSlugs} />
                </div>
              )}

              {/* Claim Section */}
              {flags["claims"] === true && (
                <section className="border-t border-zinc-100 pt-12">
                  <ClaimListingForm
                    businessId={b.id as string}
                    claimStatus={(b.claim_status as string) ?? "unclaimed"}
                    userId={user?.id ?? null}
                    claimedByUserId={(b.claimed_by_user_id as string | null) ?? null}
                    authEnabled={authEnabled}
                  />
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">
              {/* Primary CTA */}
              {typeof b.website === "string" && b.website && (
                <a
                  href={b.website}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-4 font-semibold text-white transition-all hover:bg-[var(--color-primary-light)]"
                >
                  Visit Website
                  <span className="material-symbols-outlined !text-lg transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </a>
              )}

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

              {/* Related businesses - horizontal card style */}
              {relatedBusinesses.length > 0 && (
                <BusinessBrowseLinksList
                  title={town?.name ? `Similar in ${town.name}` : "Similar places"}
                  items={relatedBusinesses}
                />
              )}

              {/* Town guides */}
              {townGuides.length > 0 && (
                <section className="border-t border-[var(--color-border)] pt-6">
                  <h2 className="text-eyebrow mb-4">Guides &amp; Stories</h2>
                  <ul className="space-y-4">
                    {townGuides.slice(0, 3).map((g) => (
                      <li key={g.slug}>
                        <Link href={`/guide/${g.slug}`} className="group block">
                          <p className="font-headline text-sm font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[var(--color-primary)]">
                            {g.title}
                          </p>
                          {g.excerpt && (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{g.excerpt}</p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
