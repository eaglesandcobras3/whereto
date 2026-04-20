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

          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/" className="hover:text-teal-700">Home</Link>
            {town?.slug && (
              <>
                <span className="mx-1 text-zinc-300">/</span>
                <Link href={`/${town.slug}`} className="hover:text-teal-700">{town.name}</Link>
              </>
            )}
            {breadcrumbCategoryLabel && (
              <>
                <span className="mx-1 text-zinc-300">/</span>
                <span className="text-zinc-400">{breadcrumbCategoryLabel}</span>
              </>
            )}
          </nav>

          {/* Intro section: portrait media + headline card */}
          <section className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
            <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-100 shadow-premium-sm">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={b.name as string}
                  className="aspect-[2/3] h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center text-zinc-400">
                  <span className="material-symbols-outlined !text-4xl" aria-hidden>
                    storefront
                  </span>
                </div>
              )}
            </div>

            <header className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-premium-sm sm:p-8 lg:p-10">
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
                {b.name as string}
              </h1>
              {oneLiner && (
                <p className="mt-4 text-xl font-medium leading-snug text-zinc-700">{oneLiner}</p>
              )}
              {b.address && (
                <p className="mt-5 flex items-start gap-2 text-zinc-600">
                  <span
                    className="material-symbols-outlined mt-0.5 !text-base text-zinc-400"
                    aria-hidden
                  >
                    place
                  </span>
                  <span>{b.address as string}</span>
                </p>
              )}
              {(familyScore || dateScore || valueScore) && (
                <div className="mt-8 border-t border-zinc-100 pt-6">
                  <div className="flex gap-8">
                    <ScoreBadge score={familyScore} label="Family" />
                    <ScoreBadge score={dateScore} label="Date Night" />
                    <ScoreBadge score={valueScore} label="Value" />
                  </div>
                </div>
              )}
            </header>
          </section>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] lg:gap-12">
            {/* Main Content */}
            <div className="space-y-10">

              {hasMarkdown ? <MarkdownRenderer content={cleanedMarkdown} /> : null}

              {/* Vibe Tags */}
              {vibe?.length ? (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Vibe</h2>
                  <div className="flex flex-wrap gap-2">
                    {vibe.map((v) => (
                      <span key={v} className="rounded-full bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-700 border border-teal-100">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!hasMarkdown && b.ai_summary ? (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">About</h2>
                  <p className="text-lg leading-relaxed text-zinc-700">{b.ai_summary as string}</p>
                </div>
              ) : null}

              {/* Highlights */}
              {highlights?.length ? (
                <div className="rounded-2xl bg-zinc-50 p-8 border border-zinc-100">
                  <h2 className="font-headline text-2xl font-bold text-zinc-900 mb-6">Highlights</h2>
                  <ul className="space-y-4">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1 text-teal-600 material-symbols-outlined !text-lg">auto_awesome</span>
                        <span className="text-zinc-700 text-lg leading-snug">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Local Tip */}
              {localTip && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-8">
                  <h2 className="flex items-center gap-2 font-headline text-xl font-bold text-amber-900 mb-3">
                    <span className="material-symbols-outlined text-amber-600">tips_and_updates</span>
                    Local Tip
                  </h2>
                  <p className="text-lg text-amber-900 leading-relaxed">{localTip}</p>
                </div>
              )}

              {/* Good For / Not Ideal For */}
              {(goodFor?.length || notIdealFor?.length) ? (
                <div className="grid gap-10 sm:grid-cols-2">
                  {goodFor?.length ? (
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Great For</h2>
                      <ul className="space-y-3">
                        {goodFor.map((g) => (
                          <li key={g} className="flex items-center gap-2.5 text-zinc-700 text-lg">
                            <span className="text-green-600 material-symbols-outlined !text-lg">check_circle</span> {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {notIdealFor?.length ? (
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Skip If</h2>
                      <ul className="space-y-3">
                        {notIdealFor.map((n) => (
                          <li key={n} className="flex items-center gap-2.5 text-zinc-500 text-lg">
                            <span className="text-zinc-300 material-symbols-outlined !text-lg">cancel</span> {n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Tags */}
              {tagSlugs.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Tags</h2>
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

            {/* Sidebar — blog-style discovery, not a map */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {b.website && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-premium-sm">
                  <a
                    href={b.website as string}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between"
                  >
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-400">Official site</p>
                      <p className="max-w-[200px] truncate font-bold text-zinc-900">Visit website</p>
                    </div>
                    <span className="material-symbols-outlined text-zinc-300 transition-all group-hover:translate-x-1 group-hover:text-teal-600">
                      arrow_forward
                    </span>
                  </a>
                </div>
              )}

              {(reservations || parking || waitTime || noiseLevel || bestTime?.length || crowd?.length) ? (
                <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-premium-sm">
                  <h2 className="font-headline text-lg font-bold text-zinc-900">Know before you go</h2>
                  <div className="space-y-3 text-sm">
                    {reservations ? (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reservations</span>
                        <p className="font-medium capitalize text-zinc-700">{reservations}</p>
                      </div>
                    ) : null}
                    {waitTime ? (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Wait time</span>
                        <p className="font-medium text-zinc-700">{waitTime}</p>
                      </div>
                    ) : null}
                    {parking ? (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Parking</span>
                        <p className="font-medium capitalize text-zinc-700">{parking}</p>
                      </div>
                    ) : null}
                    {noiseLevel ? (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Noise</span>
                        <p className="font-medium capitalize text-zinc-700">{noiseLevel}</p>
                      </div>
                    ) : null}
                    {bestTime?.length ? (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Best time</span>
                        <p className="font-medium text-zinc-700">{bestTime.join(", ")}</p>
                      </div>
                    ) : null}
                    {crowd?.length ? (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Crowd</span>
                        <p className="font-medium text-zinc-700">{crowd.join(", ")}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {relatedBusinesses.length > 0 ? (
                <section>
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
                    {town?.name ? `More in ${town.name}` : "More nearby"}
                  </h2>
                  <ul className="space-y-5">
                    {relatedBusinesses.map((rb) => {
                      const thumb = businessListingImageUrl(rb.hero_image_url);
                      const blurb =
                        (rb.ai_one_liner && rb.ai_one_liner.trim()) ||
                        (rb.ai_summary && rb.ai_summary.slice(0, 140).trim()) ||
                        null;
                      return (
                        <li key={rb.id}>
                          <Link
                            href={`/business/${rb.slug}`}
                            className="group flex gap-3 rounded-xl border border-transparent p-1 transition-colors hover:border-zinc-200 hover:bg-zinc-50/80"
                          >
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt={rb.name}
                                width={72}
                                height={108}
                                className="h-[6.75rem] w-[4.5rem] shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-[6.75rem] w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                                <span className="material-symbols-outlined !text-2xl">storefront</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-headline font-bold leading-snug text-zinc-900 group-hover:text-teal-800">
                                {rb.name}
                              </p>
                              {blurb ? (
                                <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-600">{blurb}</p>
                              ) : null}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {townGuides.length > 0 ? (
                <section>
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Guides &amp; stories</h2>
                  <ul className="space-y-6">
                    {townGuides.map((g) => (
                      <li key={g.slug}>
                        <Link href={`/guide/${g.slug}`} className="group block">
                          {g.og_image_url?.startsWith("http") ? (
                            <div className="mb-3 overflow-hidden rounded-xl border border-zinc-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={g.og_image_url}
                                alt=""
                                className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              />
                            </div>
                          ) : null}
                          <p className="font-headline text-base font-bold leading-snug text-zinc-900 group-hover:text-teal-800">
                            {g.title}
                          </p>
                          {g.excerpt ? (
                            <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{g.excerpt}</p>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
