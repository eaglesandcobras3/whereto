import { summarizeBusinessHours } from "@/lib/business/format-business-hours";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { ListingFieldFlagNote } from "@/components/business/ListingFieldFlagNote";

type Props = {
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  menuUrl?: string | null;
  bookingUrl?: string | null;
  serviceArea?: string | null;
  lat?: number | null;
  lng?: number | null;
  hours?: unknown;
  /** When set (unverified listings), show compact wrong-field reports. */
  fieldFlagEntityId?: string | null;
};

function telHref(phone: string): string | null {
  const core = phone.replace(/[^\d+]/g, "");
  return core.length >= 3 ? `tel:${core}` : null;
}

function hostnameLabel(raw: string): string {
  const href = externalWebsiteHref(raw);
  if (!href) return raw.trim();
  try {
    const u = new URL(href);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return raw.trim();
  }
}

function MsIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined shrink-0 text-[var(--color-primary)] ${className ?? ""}`} aria-hidden>
      {name}
    </span>
  );
}

export function BusinessQuickFacts({
  address,
  phone,
  website,
  menuUrl,
  bookingUrl,
  serviceArea,
  lat,
  lng,
  hours,
  fieldFlagEntityId,
}: Props) {
  const addr = typeof address === "string" ? address.trim() : "";
  const phon = typeof phone === "string" ? phone.trim() : "";
  const svc = typeof serviceArea === "string" ? serviceArea.trim() : "";
  const menu = typeof menuUrl === "string" ? menuUrl.trim() : "";
  const booking = typeof bookingUrl === "string" ? bookingUrl.trim() : "";
  const site = typeof website === "string" ? website.trim() : "";

  const hoursText = summarizeBusinessHours(hours);

  let mapsHref: string | null = null;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  } else if (addr) {
    mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }

  const phoneLink = phon ? telHref(phon) : null;

  const primaryLocationLine = addr || svc;
  const hasLocationFacts = Boolean(primaryLocationLine || mapsHref);
  const hasAny =
    hasLocationFacts || phon || hoursText || site || menu || booking;
  if (!hasAny) return null;

  return (
    <div>
      <section
        aria-labelledby="business-quick-facts-heading"
        className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6"
      >
        <h2 id="business-quick-facts-heading" className="text-eyebrow mb-4">
          Essentials
        </h2>

        <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {hasLocationFacts ? (
            <div className="min-w-0 sm:col-span-2">
              <div className="flex gap-3">
                <MsIcon name="location_on" className="!text-[22px]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="font-headline text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Location
                  </h3>
                  {primaryLocationLine ? (
                    <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
                      {primaryLocationLine}
                    </p>
                  ) : mapsHref ? (
                    <p className="text-sm italic text-zinc-600">
                      Exact map coordinates on file. We&apos;re filling in street details when
                      operators confirm them.
                    </p>
                  ) : null}
                  {addr && svc ? (
                    <p className="text-xs leading-relaxed text-zinc-600">
                      <span className="font-medium text-zinc-500">Also serves:&nbsp;</span>
                      <span>{svc}</span>
                    </p>
                  ) : null}
                  {mapsHref ? (
                    <p>
                      <a
                        href={mapsHref}
                        {...gaClickProps({
                          event: "outbound_click",
                          category: "business_essentials",
                          label: "maps",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-logo-navy)]"
                      >
                        <span className="underline-offset-4 group-hover:underline">Open in Maps</span>
                        <MsIcon
                          name="north_east"
                          className="!text-base text-[var(--color-logo-navy)]"
                        />
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {phon ? (
            <div className="flex gap-3">
              <MsIcon name="call" className="!text-[22px]" />
              <div className="min-w-0 flex-1">
                <h3 className="font-headline text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Phone
                </h3>
                <p className="mt-1">
                  {phoneLink ? (
                    <a
                      href={phoneLink}
                      {...gaClickProps({
                        event: "contact_click",
                        category: "business_essentials",
                        label: "phone",
                      })}
                      className="break-all text-sm font-medium text-[var(--color-logo-navy)] underline-offset-4 hover:underline"
                    >
                      {phon}
                    </a>
                  ) : (
                    <span className="text-sm text-zinc-700">{phon}</span>
                  )}
                </p>
              </div>
            </div>
          ) : null}

          {hoursText ? (
            <div className="flex gap-3 sm:col-span-2">
              <MsIcon name="schedule" className="!text-[22px]" />
              <div className="min-w-0 flex-1">
                <h3 className="font-headline text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Hours
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
                  {hoursText}
                </p>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Hours can change anytime. Please confirm close to your visit.
                </p>
              </div>
            </div>
          ) : null}

          {site ? (
            <div className="flex gap-3">
              <MsIcon name="language" className="!text-[22px]" />
              <div className="min-w-0 flex-1">
                <h3 className="font-headline text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Website
                </h3>
                <p className="mt-1 break-all">
                  <a
                    href={externalWebsiteHref(site) ?? "#"}
                    {...gaClickProps({
                      event: "outbound_click",
                      category: "business_essentials",
                      label: "website",
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[var(--color-logo-navy)] underline-offset-4 hover:underline"
                  >
                    {hostnameLabel(site)}
                  </a>
                </p>
              </div>
            </div>
          ) : null}

          {(menu || booking) && (
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <MsIcon name="more_horiz" className="!text-[22px] sm:translate-y-1" />
              <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2">
                {menu ? (
                  <p>
                    <a
                      href={externalWebsiteHref(menu) ?? "#"}
                      {...gaClickProps({
                        event: "outbound_click",
                        category: "business_essentials",
                        label: "menu",
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]/70 px-3 py-1.5 text-sm font-semibold text-zinc-800 transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
                    >
                      <MsIcon
                        name="restaurant_menu"
                        className="!text-lg text-[var(--color-primary)]"
                      />
                      Menu
                    </a>
                  </p>
                ) : null}
                {booking ? (
                  <p>
                    <a
                      href={externalWebsiteHref(booking) ?? "#"}
                      {...gaClickProps({
                        event: "outbound_click",
                        category: "business_essentials",
                        label: "book",
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]/70 px-3 py-1.5 text-sm font-semibold text-zinc-800 transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
                    >
                      <MsIcon
                        name="event_available"
                        className="!text-lg text-[var(--color-primary)]"
                      />
                      Book
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>
      {fieldFlagEntityId ? (
        <ListingFieldFlagNote
          entity="business"
          entityId={fieldFlagEntityId}
          field="essentials"
        />
      ) : null}
    </div>
  );
}
