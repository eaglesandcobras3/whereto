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
    const { data } = isUuid
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
    return data;
  } catch {
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

  const hasEnrichment = oneLiner || goodFor?.length;

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
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-teal-700">Home</Link>
        {town?.slug && flags["towns"] === true && (
          <>
            <span className="mx-2">›</span>
            <Link href={`/${town.slug}`} className="hover:text-teal-700">{town.name}</Link>
          </>
        )}
        {category?.name && (
          <>
            <span className="mx-2">›</span>
            <span>{category.name}</span>
          </>
        )}
      </nav>

      {/* Hero Image */}
      {heroImage && (
        <div className="mb-8 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={b.name as string}
            className="aspect-[2.4/1] w-full object-cover"
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-8 lg:col-span-2">
          {/* Header */}
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {b.name as string}
            </h1>
            {oneLiner && (
              <p className="mt-2 text-lg text-teal-700 font-medium">{oneLiner}</p>
            )}
            {b.address && (
              <p className="mt-2 text-zinc-600">{b.address as string}</p>
            )}
            {town?.name && (
              <p className="text-sm text-zinc-500">{town.name}, Florida</p>
            )}
          </header>

          {/* Scores */}
          {(familyScore || dateScore || valueScore) && (
            <div className="flex gap-6">
              <ScoreBadge score={familyScore} label="Family" />
              <ScoreBadge score={dateScore} label="Date Night" />
              <ScoreBadge score={valueScore} label="Value" />
            </div>
          )}

          {/* Vibe Tags */}
          {vibe?.length ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Vibe</h2>
              <div className="flex flex-wrap gap-2">
                {vibe.map((v) => (
                  <span key={v} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Description */}
          {b.ai_summary && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">About</h2>
              <p className="leading-relaxed text-zinc-700">{b.ai_summary as string}</p>
            </div>
          )}

          {/* Highlights */}
          {highlights?.length ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Highlights</h2>
              <ul className="space-y-2">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 text-teal-500">✦</span>
                    <span className="text-zinc-700">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Local Tip */}
          {localTip && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <h2 className="text-sm font-semibold text-amber-800 mb-1">Local Tip</h2>
              <p className="text-amber-900">{localTip}</p>
            </div>
          )}

          {/* Good For / Not Ideal For */}
          {(goodFor?.length || notIdealFor?.length) ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {goodFor?.length ? (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Great For</h2>
                  <ul className="space-y-1">
                    {goodFor.map((g) => (
                      <li key={g} className="flex items-center gap-2 text-zinc-700">
                        <span className="text-green-500">✓</span> {g}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {notIdealFor?.length ? (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Skip If</h2>
                  <ul className="space-y-1">
                    {notIdealFor.map((n) => (
                      <li key={n} className="flex items-center gap-2 text-zinc-500">
                        <span className="text-zinc-400">✗</span> {n}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Pairs With */}
          {pairsWith?.length ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Pairs Well With</h2>
              <div className="flex flex-wrap gap-2">
                {pairsWith.map((p) => <InfoPill key={p}>{p}</InfoPill>)}
              </div>
            </div>
          ) : null}

          {/* Nearby Context */}
          {nearbyContext && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">What&apos;s Nearby</h2>
              <p className="text-zinc-700">{nearbyContext}</p>
            </div>
          )}

          {/* Tags */}
          {tagSlugs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">Tags</h2>
              <TagPills tags={tagSlugs} />
            </div>
          )}

          {/* Claim Section */}
          {flags["claims"] === true && (
            <section className="border-t border-zinc-200 pt-8">
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
        <div className="space-y-6">
          {/* Google Map */}
          {hasCoords && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <iframe
                title="Map"
                width="100%"
                height="250"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${b.lat},${b.lng}&zoom=15`}
              />
              <div className="p-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-lg bg-teal-700 py-2 text-center text-sm font-medium text-white hover:bg-teal-800"
                >
                  Get Directions
                </a>
              </div>
            </div>
          )}

          {/* Contact & Links */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-zinc-900">Contact</h2>
            {b.phone && (
              <a href={`tel:${b.phone}`} className="block text-sm text-teal-700 hover:underline">
                {b.phone as string}
              </a>
            )}
            {b.website && (
              <a
                href={b.website as string}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-teal-700 hover:underline truncate"
              >
                Visit Website
              </a>
            )}
          </div>

          {/* Practical Info */}
          {(reservations || parking || waitTime || noiseLevel || bestTime?.length || crowd?.length) && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
              <h2 className="font-semibold text-zinc-900">Know Before You Go</h2>

              {reservations && (
                <div>
                  <span className="text-xs font-medium text-zinc-500 uppercase">Reservations</span>
                  <p className="text-sm text-zinc-700 capitalize">{reservations}</p>
                </div>
              )}

              {waitTime && (
                <div>
                  <span className="text-xs font-medium text-zinc-500 uppercase">Wait Time</span>
                  <p className="text-sm text-zinc-700">{waitTime}</p>
                </div>
              )}

              {parking && (
                <div>
                  <span className="text-xs font-medium text-zinc-500 uppercase">Parking</span>
                  <p className="text-sm text-zinc-700 capitalize">{parking}</p>
                </div>
              )}

              {noiseLevel && (
                <div>
                  <span className="text-xs font-medium text-zinc-500 uppercase">Noise Level</span>
                  <p className="text-sm text-zinc-700 capitalize">{noiseLevel}</p>
                </div>
              )}

              {bestTime?.length ? (
                <div>
                  <span className="text-xs font-medium text-zinc-500 uppercase">Best Time to Visit</span>
                  <p className="text-sm text-zinc-700">{bestTime.join(", ")}</p>
                </div>
              ) : null}

              {crowd?.length ? (
                <div>
                  <span className="text-xs font-medium text-zinc-500 uppercase">Typical Crowd</span>
                  <p className="text-sm text-zinc-700">{crowd.join(", ")}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
