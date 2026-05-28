import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { weekdayLongName } from "@/lib/events/recurrence";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrl } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";

export const revalidate = 1800;

type Props = { params: Promise<{ slug: string }> };

type EventRow = {
  title: string;
  description: string | null;
  hero_image_url: string | null;
  event_date: string;
  end_date: string | null;
  recurrence_frequency: string | null;
  recurrence_weekday: number | null;
  next_list_date: string | null;
  venue_name: string | null;
  address: string | null;
  price: string | null;
  website: string | null;
  tags: string[] | null;
  town_name: string | null;
  town_slug: string | null;
};

function parseWeekdayFromRRule(rule: string | null): number | null {
  if (!rule || !rule.toLowerCase().includes("weekly")) return null;
  const m = /BYDAY=([A-Z]{2})/i.exec(rule);
  if (!m) return null;
  const map: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  return map[m[1].toUpperCase()] ?? null;
}

async function loadEvent(slug: string): Promise<EventRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, excerpt, content, slug, starts_at, ends_at, recurrence_rule, main_image, hero_image, location_name, address, cost_notes, ticket_url, intent_tags, status",
    )
    .eq("slug", slug)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    title: string;
    excerpt: string | null;
    content: string | null;
    starts_at: string | null;
    ends_at: string | null;
    recurrence_rule: string | null;
    main_image: string | null;
    hero_image: string | null;
    location_name: string | null;
    address: string | null;
    cost_notes: string | null;
    ticket_url: string | null;
    intent_tags: unknown;
  };

  const { data: et } = await supabase
    .from("event_towns")
    .select("towns ( title, slug )")
    .eq("event_id", row.id)
    .limit(1)
    .maybeSingle();

  const rawT = (et as { towns: { title: string; slug: string } | { title: string; slug: string }[] | null } | null)
    ?.towns;
  const t = Array.isArray(rawT) ? rawT[0] : rawT;

  const start = row.starts_at ? row.starts_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const end = row.ends_at ? row.ends_at.slice(0, 10) : null;
  const hero = getPublicImageUrl(row.main_image) ?? getPublicImageUrl(row.hero_image);
  const tags = Array.isArray(row.intent_tags)
    ? row.intent_tags.filter((x): x is string => typeof x === "string")
    : null;
  const wd = parseWeekdayFromRRule(row.recurrence_rule);

  return {
    title: row.title,
    description: row.excerpt ?? row.content,
    hero_image_url: hero,
    event_date: start,
    end_date: end,
    recurrence_frequency: row.recurrence_rule?.toLowerCase().includes("weekly") ? "weekly" : null,
    recurrence_weekday: wd,
    next_list_date: row.starts_at,
    venue_name: row.location_name,
    address: row.address,
    price: row.cost_notes,
    website: row.ticket_url,
    tags,
    town_name: t?.title ?? null,
    town_slug: t?.slug ?? null,
  };
}

function formatDateRange(eventDate: string, endDate: string | null): string {
  const start = new Date(eventDate + "T12:00:00");
  if (!endDate || endDate === eventDate) {
    return start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  const end = new Date(endDate + "T12:00:00");
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${end.toLocaleDateString("en-US", { day: "numeric", year: "numeric" })}`;
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatSeasonLine(eventDate: string, endDate: string | null): string {
  const start = new Date(eventDate + "T12:00:00");
  if (!endDate || endDate === eventDate) {
    return start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  const end = new Date(endDate + "T12:00:00");
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) return { title: "Event" };
  const seg = normalizeUrlSegment(slug);
  return {
    ...canonicalAlternates(`/events/${seg}`),
    title: event.title,
    description: event.description?.slice(0, 160) ?? `Event on 30A: ${event.title}`,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) notFound();

  const heroIsRemote =
    event.hero_image_url?.startsWith("https://") || event.hero_image_url?.startsWith("http://");

  const ticketWebsiteHref = externalWebsiteHref(event.website);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
        <Link href="/" className="hover:text-[var(--color-primary)]">
          Home
        </Link>
        <span className="material-symbols-outlined !text-xs opacity-40">chevron_right</span>
        <Link href="/search?type=events" className="hover:text-[var(--color-primary)]">
          Events
        </Link>
        <span className="material-symbols-outlined !text-xs opacity-40">chevron_right</span>
        <span className="text-[var(--color-text-secondary)]">{event.title}</span>
      </nav>

      {event.hero_image_url && heroIsRemote ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.hero_image_url}
          alt=""
          className="mb-8 aspect-[21/9] w-full rounded-2xl object-cover"
        />
      ) : null}

      <header className="mb-8">
        {event.recurrence_frequency === "weekly" && event.recurrence_weekday != null && event.recurrence_weekday >= 0 && event.recurrence_weekday <= 6 ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Every {weekdayLongName(event.recurrence_weekday)}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">Season {formatSeasonLine(event.event_date, event.end_date)}</p>
            {event.next_list_date ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Next:{" "}
                {new Date(event.next_list_date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            {formatDateRange(event.event_date, event.end_date)}
          </p>
        )}
        <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] md:text-4xl">
          {event.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--color-text-secondary)]">
          {event.town_slug && event.town_name ? (
            <Link href={`/${event.town_slug}`} className="hover:text-[var(--color-primary)]">
              {event.town_name}
            </Link>
          ) : null}
          {event.venue_name ? <span>{event.venue_name}</span> : null}
          {event.address ? <span>{event.address}</span> : null}
          {event.price ? <span className="font-medium text-[var(--color-text-primary)]">{event.price}</span> : null}
        </div>
        {ticketWebsiteHref ? (
          <a
            href={ticketWebsiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Tickets / site
            <span className="material-symbols-outlined !text-lg">open_in_new</span>
          </a>
        ) : null}
      </header>

      {event.description ? (
        <div className="prose prose-neutral max-w-none text-[var(--color-text-secondary)]">
          <p className="whitespace-pre-wrap leading-relaxed">{event.description}</p>
        </div>
      ) : null}

      {event.tags && event.tags.length > 0 ? (
        <ul className="mt-8 flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <li key={tag}>
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                {tag}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
