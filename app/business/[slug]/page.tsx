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
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/home/SiteFooter";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Props = { params: Promise<{ slug: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadBusiness(slug: string) {
  try {
    const supabase = getServiceSupabase();
    const isUuid = UUID_RE.test(slug);
    const sel = `
        id, slug, name, address, town_id, category_id, lat, lng, phone, website,
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
    title: `${b.name as string} — WhereTo30A`,
    description: desc,
    openGraph: ogUrl
      ? { title: `${b.name as string} — WhereTo30A`, description: desc, images: [{ url: ogUrl }] }
      : { title: `${b.name as string} — WhereTo30A`, description: desc },
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

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
      {children}
    </span>
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

  const town = b.towns as { name?: string; slug?: string } | null;
  const category = b.categories as { name?: string } | null;
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
  const pairsWith = b.ai_pairs_with as string[] | null;
  const oneLiner = b.ai_one_liner as string | null;
  const localTip = b.ai_local_tip as string | null;
  const highlights = b.ai_highlights as string[] | null;
  const nearbyContext = b.ai_nearby_context as string | null;
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

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Navbar compact />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-12 md:px-10">
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
            {category?.name && (
              <>
                <span className="mx-1 text-zinc-300">/</span>
                <span className="text-zinc-400">{category.name}</span>
              </>
            )}
          </nav>

          {/* Hero Image */}
          {heroImage && (
            <div className="mb-12 overflow-hidden rounded-[2rem] border border-[var(--color-border)] shadow-premium-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={b.name as string}
                className="aspect-[2.4/1] w-full object-cover"
              />
            </div>
          )}

          <div className="grid gap-12 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-12 lg:col-span-2">
              {/* Header */}
              <header>
                <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-zinc-900 sm:text-5xl">
                  {b.name as string}
                </h1>
                {oneLiner && (
                  <p className="mt-4 text-xl text-teal-700 font-medium leading-tight">{oneLiner}</p>
                )}
                {b.address && (
                  <p className="mt-3 text-zinc-600 flex items-center gap-1.5">
                    <span className="material-symbols-outlined !text-base text-zinc-400">place</span>
                    {b.address as string}
                  </p>
                )}
              </header>

              {/* Scores */}
              {(familyScore || dateScore || valueScore) && (
                <div className="flex gap-8 border-y border-zinc-100 py-6">
                  <ScoreBadge score={familyScore} label="Family" />
                  <ScoreBadge score={dateScore} label="Date Night" />
                  <ScoreBadge score={valueScore} label="Value" />
                </div>
              )}

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

              {/* Full Markdown Content (from Pages table) */}
              {(b.pages as any)?.body_markdown ? (
                <MarkdownRenderer content={(b.pages as any).body_markdown} />
              ) : (
                /* Fallback to simple description if no rich page exists */
                b.ai_summary && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">About</h2>
                    <p className="text-lg leading-relaxed text-zinc-700">{b.ai_summary as string}</p>
                  </div>
                )
              )}

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

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Google Map */}
              {hasCoords && (
                <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-premium-sm">
                  <iframe
                    title="Map"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${b.lat},${b.lng}&zoom=15`}
                  />
                  <div className="p-4">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full rounded-full bg-zinc-900 py-3 text-center text-sm font-bold text-white hover:bg-zinc-800 transition-all"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              )}

              {/* Website Link (Simplified Contact) */}
              {b.website && (
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-premium-sm">
                  <a
                    href={b.website as string}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Official Site</p>
                      <p className="font-bold text-zinc-900 truncate max-w-[180px]">Visit Website</p>
                    </div>
                    <span className="material-symbols-outlined text-zinc-300 group-hover:text-teal-600 group-hover:translate-x-1 transition-all">arrow_forward</span>
                  </a>
                </div>
              )}

              {/* Practical Info */}
              {(reservations || parking || waitTime || noiseLevel || bestTime?.length || crowd?.length) && (
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-premium-sm space-y-6">
                  <h2 className="font-headline text-xl font-bold text-zinc-900">Know Before You Go</h2>

                  <div className="space-y-4">
                    {reservations && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reservations</span>
                        <p className="text-sm font-medium text-zinc-700 capitalize">{reservations}</p>
                      </div>
                    )}

                    {waitTime && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Wait Time</span>
                        <p className="text-sm font-medium text-zinc-700">{waitTime}</p>
                      </div>
                    )}

                    {parking && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Parking</span>
                        <p className="text-sm font-medium text-zinc-700 capitalize">{parking}</p>
                      </div>
                    )}

                    {noiseLevel && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Noise Level</span>
                        <p className="text-sm font-medium text-zinc-700 capitalize">{noiseLevel}</p>
                      </div>
                    )}

                    {bestTime?.length ? (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Best Time to Visit</span>
                        <p className="text-sm font-medium text-zinc-700">{bestTime.join(", ")}</p>
                      </div>
                    ) : null}

                    {crowd?.length ? (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Typical Crowd</span>
                        <p className="text-sm font-medium text-zinc-700">{crowd.join(", ")}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
