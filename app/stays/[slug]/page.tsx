import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OpenStreetMap } from "@/components/OpenStreetMap";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import { RentalBookingCta } from "@/components/stays/RentalBookingCta";
import { RentalPartnerBadge } from "@/components/stays/RentalPartnerBadge";
import { StayUpdateListingCta } from "@/components/stays/StayUpdateListingCta";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { generateBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { getSiteUrl } from "@/lib/site-url";
import { PROPERTY_TYPE_LABELS, staysPropertyPath, STAYS_HUB_PATH } from "@/lib/stays/constants";
import { isPublicRentalVisible, isRentalIndexReady } from "@/lib/stays/eligibility";
import { getPublishedRentalBySlug } from "@/lib/stays/execute-search";
import { generateVacationRentalSchema, staysPropertyMetadata } from "@/lib/stays/seo";
import { getServiceSupabase, getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

/** ISR — same cadence as business listings. */
export const revalidate = 21600;
export const dynamicParams = true;

const STATIC_PARAMS_PAGE_SIZE = 1000;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];
  try {
    const out: { slug: string }[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("rental_properties")
        .select("slug")
        .eq("status", "published")
        .order("id", { ascending: true })
        .range(from, from + STATIC_PARAMS_PAGE_SIZE - 1);
      if (error) break;
      const batch = (data ?? []) as { slug: string }[];
      for (const row of batch) {
        const slug = row.slug?.trim();
        if (slug) out.push({ slug });
      }
      if (batch.length < STATIC_PARAMS_PAGE_SIZE) break;
      from += STATIC_PARAMS_PAGE_SIZE;
    }
    return out;
  } catch {
    return [];
  }
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const property = await getPublishedRentalBySlug(slug);
    if (!property || !isPublicRentalVisible(property)) {
      return { title: "Stay not found", robots: { index: false } };
    }
    const meta = staysPropertyMetadata(property);
    if (!isRentalIndexReady(property)) {
      return { ...meta, robots: { index: false, follow: true } };
    }
    return meta;
  } catch {
    return { title: "Stays", robots: { index: false } };
  }
}

export default async function StayDetailPage({ params }: Props) {
  const flags = await getAllFeatureFlags();
  if (!isRentalsFeatureEnabled(flags)) notFound();

  const { slug } = await params;
  let property;
  try {
    property = await getPublishedRentalBySlug(slug);
  } catch {
    notFound();
  }
  if (!property || !isPublicRentalVisible(property)) notFound();

  const supabase = getServiceSupabase();
  const { data: images } = await supabase
    .from("rental_images")
    .select("id, storage_url, alt, sort")
    .eq("property_id", property.id)
    .order("sort", { ascending: true })
    .limit(24);

  const gallery =
    (images as { id: string; storage_url: string; alt: string | null }[] | null)?.length
      ? (images as { id: string; storage_url: string; alt: string | null }[])
      : property.hero_image_url || property.primary_image_url
        ? [
            {
              id: "hero",
              storage_url: (property.hero_image_url || property.primary_image_url)!,
              alt: property.title,
            },
          ]
        : [];

  const pageUrl = `${getSiteUrl()}${staysPropertyPath(property.slug)}`;
  const schema = generateVacationRentalSchema(property, pageUrl);
  const breadcrumbs = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Stays", url: STAYS_HUB_PATH },
    ...(property.town_slug && property.town_title
      ? [{ name: property.town_title, url: `/stays/town/${property.town_slug}` }]
      : []),
    { name: property.title, url: staysPropertyPath(property.slug) },
  ]);

  const showMap =
    property.location_precision !== "hidden" &&
    property.map_lat != null &&
    property.map_lng != null;

  const typeLabel = PROPERTY_TYPE_LABELS[property.property_type] ?? property.property_type;
  const amenityFlags = [
    property.pets_allowed ? "Pet friendly" : null,
    property.private_pool ? "Private pool" : null,
    property.gulf_front ? "Gulf front" : null,
    property.gulf_view ? "Gulf view" : null,
    property.golf_cart_included ? "Golf cart included" : null,
    property.beach_access && property.beach_access !== "none"
      ? `${property.beach_access} beach access`
      : null,
  ].filter(Boolean) as string[];

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <p className="text-sm text-zinc-500">
          <Link href={STAYS_HUB_PATH} className="hover:text-teal-900">
            Stays
          </Link>
          {property.town_title ? ` / ${property.town_title}` : null}
        </p>

        <div className="mt-4 grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              {property.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              {typeLabel} · {property.bedrooms} bed · {property.bathrooms} bath · Sleeps{" "}
              {property.sleeps}
              {property.area_title ? ` · ${property.area_title}` : ""}
            </p>
            {property.community_name ||
            property.town_title ||
            (property.location_precision === "exact" && property.street_address) ? (
              <p className="mt-1 text-sm text-zinc-600">
                {property.location_precision === "exact" && property.street_address
                  ? [
                      property.street_address,
                      property.community_name,
                      property.town_title,
                      property.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : [property.community_name, property.town_title].filter(Boolean).join(" · ") ||
                    property.town_title}
                {property.location_precision === "approximate" ? (
                  <span className="text-zinc-500"> · Approximate area</span>
                ) : null}
              </p>
            ) : null}
            <div className="mt-3">
              <RentalPartnerBadge
                businessSlug={property.business_slug}
                businessTitle={property.business_title}
                partnerDisplayName={property.partner_display_name}
                showPublicBusiness={property.partner_show_public_business_profile}
                isVerified={property.business_is_verified}
                partnerActive={property.partner_status === "active"}
              />
            </div>

            {gallery.length > 0 ? (
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {gallery.slice(0, 4).map((img, idx) => (
                  <div
                    key={img.id}
                    className={`relative overflow-hidden bg-zinc-100 ${idx === 0 ? "sm:col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}
                  >
                    <RemoteCoverImage
                      src={img.storage_url}
                      alt={img.alt || property.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 60vw"
                      placeholderIcon="home"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {property.description ? (
              <section className="mt-8">
                <h2 className="font-headline text-xl font-semibold text-zinc-900">About this stay</h2>
                <div className="prose prose-zinc mt-3 max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {property.description}
                </div>
              </section>
            ) : null}

            {property.local_context ? (
              <section className="mt-8">
                <h2 className="font-headline text-xl font-semibold text-zinc-900">
                  Local context from WhereTo30A
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {property.local_context}
                </p>
              </section>
            ) : null}

            {amenityFlags.length > 0 ? (
              <section className="mt-8">
                <h2 className="font-headline text-xl font-semibold text-zinc-900">Highlights</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {amenityFlags.map((a) => (
                    <li key={a} className="text-sm text-zinc-700">
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {property.parking_notes || property.rules || property.walkability_notes ? (
              <section className="mt-8 space-y-4">
                {property.parking_notes ? (
                  <div>
                    <h2 className="font-headline text-lg font-semibold text-zinc-900">Parking</h2>
                    <p className="mt-1 text-sm text-zinc-700">{property.parking_notes}</p>
                  </div>
                ) : null}
                {property.walkability_notes ? (
                  <div>
                    <h2 className="font-headline text-lg font-semibold text-zinc-900">Getting around</h2>
                    <p className="mt-1 text-sm text-zinc-700">{property.walkability_notes}</p>
                  </div>
                ) : null}
                {property.rules ? (
                  <div>
                    <h2 className="font-headline text-lg font-semibold text-zinc-900">House rules</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{property.rules}</p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {showMap ? (
              <section className="mt-8">
                <h2 className="font-headline text-xl font-semibold text-zinc-900">Location</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {property.location_precision === "approximate"
                    ? "Approximate location for privacy."
                    : "Map location provided by the property manager."}
                </p>
                <div className="mt-3 h-64 overflow-hidden border border-zinc-200">
                  <OpenStreetMap
                    lat={property.map_lat!}
                    lng={property.map_lng!}
                    zoom={13}
                    className="h-full min-h-[16rem] !rounded-none"
                  />
                </div>
              </section>
            ) : null}

            {property.town_slug ? (
              <p className="mt-8 text-sm text-zinc-600">
                Explore more in{" "}
                <Link
                  href={`/town/${property.town_slug}`}
                  className="font-medium text-teal-900 underline"
                >
                  {property.town_title}
                </Link>{" "}
                or{" "}
                <Link
                  href={`/stays/town/${property.town_slug}`}
                  className="font-medium text-teal-900 underline"
                >
                  more stays in {property.town_title}
                </Link>
                .
              </p>
            ) : null}

            {property.last_synced_at ? (
              <p className="mt-6 text-xs text-zinc-400">
                Inventory last updated {new Date(property.last_synced_at).toLocaleDateString()}
              </p>
            ) : null}

            <StayUpdateListingCta
              className="mt-10 sm:mt-12"
              analyticsLabel={`stay_${property.slug}`}
            />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-zinc-200 bg-[linear-gradient(160deg,#f8fafc,#ecfeff)] p-5">
              {property.pricing_reliable && property.starting_nightly_rate != null ? (
                <p className="text-sm text-zinc-700">
                  From{" "}
                  <span className="text-lg font-semibold text-zinc-900">
                    ${Number(property.starting_nightly_rate).toFixed(0)}
                  </span>{" "}
                  / night
                </p>
              ) : (
                <p className="text-sm text-zinc-600">
                  {property.pricing_disclaimer ||
                    "Rates and availability are confirmed on the manager’s booking site."}
                </p>
              )}
              <div className="mt-4">
                <Suspense
                  fallback={
                    <div className="inline-flex w-full items-center justify-center bg-teal-800/80 px-5 py-3 text-sm font-semibold text-white">
                      Check availability
                    </div>
                  }
                >
                  <RentalBookingCta
                    propertyId={property.id}
                    businessId={property.business_id}
                  />
                </Suspense>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
