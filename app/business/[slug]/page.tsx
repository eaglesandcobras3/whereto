import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { TagPills } from "@/components/discovery/TagPills";
import { ClaimListingForm } from "@/components/ClaimListingForm";

type Props = { params: Promise<{ slug: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadBusiness(slug: string) {
  try {
    const supabase = getServiceSupabase();
    const isUuid = UUID_RE.test(slug);
    const sel = `
        id, slug, name, address, town_id, category_id, lat, lng, phone, website,
        ai_summary, google_rating, google_review_count,
        claim_status, claimed_by_user_id,
        business_tags(tags(name, slug)),
        towns(name, slug)
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
  return {
    title: `${b.name as string} — WhereTo30A`,
    description: (b.ai_summary as string)?.slice(0, 160) ?? undefined,
  };
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const b = await loadBusiness(slug);
  if (!b) notFound();

  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  const town = b.towns as { name?: string; slug?: string } | null;
  const tagRows = b.business_tags as
    | { tags: { slug?: string } | null }[]
    | null;
  const tagSlugs: string[] = [];
  for (const row of tagRows ?? []) {
    const t = row.tags;
    if (t && typeof t === "object" && "slug" in t && t.slug) tagSlugs.push(t.slug);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name as string,
    description: (b.ai_summary as string) || undefined,
    address: b.address ? { "@type": "PostalAddress", streetAddress: b.address } : undefined,
    geo:
      b.lat != null && b.lng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: b.lat,
            longitude: b.lng,
          }
        : undefined,
    url: `${getSiteUrl()}/business/${b.slug as string}`,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-[var(--accent)]">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {town?.slug ? (
          <>
            {" · "}
            <Link href={`/${town.slug}`} className="hover:underline">
              {town.name}
            </Link>
          </>
        ) : null}
      </nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {b.name as string}
        </h1>
        {b.address ? (
          <p className="text-zinc-600">{b.address as string}</p>
        ) : null}
      </header>
      {b.ai_summary ? (
        <p className="leading-relaxed text-zinc-700">{b.ai_summary as string}</p>
      ) : null}
      <TagPills tags={tagSlugs} />
      <div className="flex flex-wrap gap-3 text-sm">
        {b.lat != null && b.lng != null ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
            className="rounded-xl border border-zinc-200/90 px-4 py-2 font-medium text-[var(--accent)] hover:bg-zinc-50"
            target="_blank"
            rel="noreferrer"
          >
            Directions
          </a>
        ) : null}
        {b.website ? (
          <a
            href={b.website as string}
            className="rounded-xl border border-zinc-200/90 px-4 py-2 font-medium text-[var(--accent)] hover:bg-zinc-50"
            target="_blank"
            rel="noreferrer"
          >
            Website
          </a>
        ) : null}
      </div>

      <section className="border-t border-zinc-200 pt-8">
        <ClaimListingForm
          businessId={b.id as string}
          claimStatus={(b.claim_status as string) ?? "unclaimed"}
          userId={user?.id ?? null}
          claimedByUserId={(b.claimed_by_user_id as string | null) ?? null}
        />
      </section>
    </div>
  );
}
