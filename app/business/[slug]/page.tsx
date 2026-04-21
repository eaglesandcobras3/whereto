import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { TagPills } from "@/components/discovery/TagPills";
import { ClaimListingForm } from "@/components/ClaimListingForm";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import Image from "next/image";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";

type Props = { params: Promise<{ slug: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadBusiness(slug: string) {
  try {
    const supabase = getServiceSupabase();
    const isUuid = UUID_RE.test(slug);
    const sel = `
        id, slug, name, address, town_id, category_id, lat, lng, phone, website,
        has_physical_location,
        ai_summary, listing_rating, listing_review_count, legacy_photo_refs, hero_image_url,
        claim_status, claimed_by_user_id,
        ai_vibe, ai_crowd, ai_noise_level,
        ai_best_time, ai_reservations, ai_parking, ai_wait_time,
        ai_good_for, ai_not_ideal_for, ai_pairs_with,
        ai_one_liner, ai_local_tip, ai_highlights, ai_nearby_context,
        ai_family_score, ai_date_score, ai_value_score,
        business_tags(tags(name, slug)),
        towns(name, slug),
        categories(name)
      `;
    
    // 1. Fetch Business
    const { data: business, error: bizErr } = isUuid
      ? await supabase
          .from("businesses")
          .select(sel)
          .eq("status", "active")
          .eq("id", slug)
          .maybeSingle()
      : await supabase
          .from("businesses")
          .select(sel)
          .eq("status", "active")
          .eq("slug", slug)
          .maybeSingle();

    if (bizErr || !business) return null;

    // 2. Fetch Page content by slug
    const { data: page } = await supabase
      .from("pages")
      .select("body_markdown")
      .eq("slug", business.slug)
      .eq("status", "published")
      .maybeSingle();

    return { ...business, pages: page };
  } catch (e) {
    console.error("loadBusiness error:", e);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await loadBusiness(slug);
  if (!b) return { title: "Business" };
  const desc = (b.ai_one_liner as string) || (b.ai_summary as string)?.slice(0, 160) || undefined;
  const hero = businessListingImageUrl(b.hero_image_url as string | null);
  const ogUrl = hero ?? undefined;
  return {
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

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const b = await loadBusiness(slug);
  if (!b) notFound();

  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  const flags = await getAllFeatureFlags();
  const supabase = getServiceSupabase();
  const townId = b.town_id as number | null;
  const businessId = b.id as string;

  type RelatedBusinessRow = {
    id: string;
    name: string;
    slug: string;
    hero_image_url: string | null;
    ai_one_liner: string | null;
    ai_summary: string | null;
  };

  type GuideCardRow = {
    slug: string;
    title: string;
    excerpt: string | null;
    og_image_url: string | null;
  };

  let relatedBusinesses: RelatedBusinessRow[] = [];
  if (townId != null) {
    const { data } = await supabase
      .from("businesses")
      .select("id, name, slug, hero_image_url, ai_one_liner, ai_summary")
      .eq("town_id", townId)
      .neq("id", businessId)
      .eq("status", "active")
      .order("confidence_score", { ascending: false })
      .limit(5);
    relatedBusinesses = (data as RelatedBusinessRow[] | null) ?? [];
  }

  let townGuides: GuideCardRow[] = [];
  if (townId != null) {
    const { data: ents } = await supabase
      .from("entities")
      .select("id")
      .eq("primary_town_id", townId)
      .eq("status", "published")
      .in("entity_type", ["guide", "seasonal_guide"])
      .limit(24);
    const entityIds = (ents ?? []).map((e) => e.id as string).filter(Boolean);
    if (entityIds.length > 0) {
      const { data: g } = await supabase
        .from("pages")
        .select("slug, title, excerpt, og_image_url")
        .eq("page_type", "guide")
        .eq("status", "published")
        .in("entity_id", entityIds)
        .limit(6);
      townGuides = (g as GuideCardRow[] | null) ?? [];
    }
  }
  if (townGuides.length === 0) {
    const { data: g2 } = await supabase
      .from("pages")
      .select("slug, title, excerpt, og_image_url")
      .eq("page_type", "guide")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5);
    townGuides = (g2 as GuideCardRow[] | null) ?? [];
  }

  const town = b.towns as { name?: string; slug?: string } | null;
  const category = b.categories as { name?: string } | null;
  const hasPhysicalLocation = Boolean(b.has_physical_location);
  const normalizedCategoryName = (category?.name ?? "").trim().toLowerCase();
  const breadcrumbCategoryLabel =
    hasPhysicalLocation && normalizedCategoryName === "services"
      ? "Businesses"
      : category?.name ?? null;
  const tagRows = b.business_tags as
    | { tags: { slug?: string } | null }[]
    | null;
  const tagSlugs: string[] = [];
  for (const row of tagRows ?? []) {
    const t = row.tags;
    if (t && typeof t === "object" && "slug" in t && t.slug) tagSlugs.push(t.slug);
  }

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
  const familyScore = b.ai_family_score as number | null;
  const dateScore = b.ai_date_score as number | null;
  const valueScore = b.ai_value_score as number | null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name as string,
    description: oneLiner || (b.ai_summary as string) || undefined,
    address: b.address ? { "@type": "PostalAddress", streetAddress: b.address } : undefined,
    geo: hasCoords
      ? { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng }
      : undefined,
    url: `${getSiteUrl()}/business/${b.slug as string}`,
    ...(heroImage ? { image: [heroImage] } : {}),
  };

  const rawMarkdown = (b.pages as { body_markdown?: string } | null)?.body_markdown?.trim() ?? "";
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
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          {/* Editorial Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-sm">
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

          {/* Hero Gallery - Horizontal portrait scroll */}
          <section className="mb-10">
            <div className="gallery-scroll scrollbar-thin -mx-4 px-4 sm:-mx-10 sm:px-10">
              {/* Main hero image - larger */}
              <div className="group relative aspect-[2/3] w-[280px] shrink-0 overflow-hidden rounded-2xl bg-zinc-100 sm:w-[320px] md:w-[360px]">
                {heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroImage}
                    alt={b.name as string}
                    className="img-editorial-fast h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-400">
                    <span className="material-symbols-outlined !text-5xl" aria-hidden>
                      storefront
                    </span>
                  </div>
                )}
              </div>
              {/* Placeholder for additional images - would come from business_images table */}
              {heroImage && (
                <>
                  <div className="relative aspect-[2/3] w-[200px] shrink-0 overflow-hidden rounded-2xl bg-zinc-100 sm:w-[240px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImage}
                      alt=""
                      className="h-full w-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Article Header */}
          <header className="mb-10 max-w-3xl">
            <h1 className="text-editorial-headline text-4xl text-zinc-900 sm:text-5xl lg:text-6xl">
              {b.name as string}
            </h1>
            {oneLiner && (
              <p className="mt-5 text-xl leading-relaxed text-zinc-600 sm:text-2xl">{oneLiner}</p>
            )}

            {/* Quick meta row */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              {town?.name && (
                <Link href={`/${town.slug}`} className="flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]">
                  <span className="material-symbols-outlined !text-base">place</span>
                  {town.name}
                </Link>
              )}
              {category?.name && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined !text-base">category</span>
                  {category.name}
                </span>
              )}
              {b.address && (
                <span className="hidden text-zinc-400 sm:block">{b.address as string}</span>
              )}
            </div>

            {/* Score badges inline */}
            {(familyScore || dateScore || valueScore) && (
              <div className="mt-6 flex gap-6">
                <ScoreBadge score={familyScore} label="Family" />
                <ScoreBadge score={dateScore} label="Date Night" />
                <ScoreBadge score={valueScore} label="Value" />
              </div>
            )}
          </header>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] lg:gap-12">
            {/* Main Content */}
            <div className="space-y-10">

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

              {/* Highlights - clean card */}
              {highlights?.length ? (
                <div className="rounded-2xl bg-[var(--color-surface-container-low)] p-6 sm:p-8">
                  <h2 className="font-headline text-xl font-bold text-zinc-900 mb-5">Highlights</h2>
                  <ul className="space-y-3">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 text-[var(--color-primary)] material-symbols-outlined !text-lg">check_circle</span>
                        <span className="text-zinc-700 leading-relaxed">{h}</span>
                      </li>
                    ))}
                  </ul>
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
                  />
                </section>
              )}
            </div>

            {/* Sidebar — sticky editorial discovery */}
            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              {/* Primary CTA */}
              {b.website && (
                <a
                  href={b.website as string}
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
                <section>
                  <h2 className="text-eyebrow mb-4">
                    {town?.name ? `More in ${town.name}` : "More nearby"}
                  </h2>
                  <ul className="space-y-3">
                    {relatedBusinesses.map((rb) => {
                      const thumb = businessListingImageUrl(rb.hero_image_url);
                      const blurb =
                        (rb.ai_one_liner && rb.ai_one_liner.trim()) ||
                        (rb.ai_summary && rb.ai_summary.slice(0, 100).trim()) ||
                        null;
                      return (
                        <li key={rb.id}>
                          <Link
                            href={`/business/${rb.slug}`}
                            className="group flex gap-3 rounded-xl p-1 transition-colors hover:bg-[var(--color-surface-container-low)]"
                          >
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt={rb.name}
                                width={64}
                                height={96}
                                className="aspect-[2/3] w-16 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex aspect-[2/3] w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                                <span className="material-symbols-outlined !text-xl">storefront</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1 py-1">
                              <p className="font-headline text-sm font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[var(--color-primary)]">
                                {rb.name}
                              </p>
                              {blurb && (
                                <p className="mt-1 line-clamp-2 text-xs leading-snug text-zinc-500">{blurb}</p>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
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
