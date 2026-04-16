import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { weekdayLongName } from "@/lib/events/recurrence";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type Props = { params: Promise<{ slug: string }> };

type EventRow = {
  title: string;
  description: string | null;
  hero_image_url: string | null;
  event_date: string;
  end_date: string | null;
  recurrence_frequency: string | null;
  recurrence_weekday: number | null;
  /** From `upcoming_events` when the series still has a future occurrence. */
  next_list_date: string | null;
  venue_name: string | null;
  address: string | null;
  price: string | null;
  website: string | null;
  tags: string[] | null;
  town_name: string | null;
  town_slug: string | null;
};

async function loadEvent(slug: string): Promise<EventRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("events")
    .select(
      "title, description, hero_image_url, event_date, end_date, recurrence_frequency, recurrence_weekday, venue_name, address, price, website, tags, town_id"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const { data: upcoming } = await supabase
    .from("upcoming_events")
    .select("next_list_date")
    .eq("slug", slug)
    .maybeSingle();

  let town_name: string | null = null;
  let town_slug: string | null = null;
  const townId = data.town_id as number | null;
  if (townId) {
    const { data: town } = await supabase
      .from("towns")
      .select("name, slug")
      .eq("id", townId)
      .maybeSingle();
    if (town) {
      town_name = town.name as string;
      town_slug = town.slug as string;
    }
  }

  return {
    title: data.title as string,
    description: data.description as string | null,
    hero_image_url: data.hero_image_url as string | null,
    event_date: data.event_date as string,
    end_date: data.end_date as string | null,
    recurrence_frequency: (data.recurrence_frequency as string | null) ?? null,
    recurrence_weekday: (data.recurrence_weekday as number | null) ?? null,
    next_list_date: (upcoming?.next_list_date as string | null) ?? null,
    venue_name: data.venue_name as string | null,
    address: data.address as string | null,
    price: data.price as string | null,
    website: data.website as string | null,
    tags: data.tags as string[] | null,
    town_name,
    town_slug,
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
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
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
  return {
    title: `${event.title} | WhereTo30A`,
    description: event.description?.slice(0, 160) ?? `Event on 30A: ${event.title}`,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) notFound();

  const heroIsRemote =
    event.hero_image_url?.startsWith("https://") || event.hero_image_url?.startsWith("http://");

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
        {event.recurrence_frequency === "weekly" &&
        event.recurrence_weekday != null &&
        event.recurrence_weekday >= 0 &&
        event.recurrence_weekday <= 6 ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Every {weekdayLongName(event.recurrence_weekday)}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Season {formatSeasonLine(event.event_date, event.end_date)}
            </p>
            {event.next_list_date ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Next date:{" "}
                {new Date(event.next_list_date + "T12:00:00").toLocaleDateString("en-US", {
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
        {event.website ? (
          <a
            href={event.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Official site
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
