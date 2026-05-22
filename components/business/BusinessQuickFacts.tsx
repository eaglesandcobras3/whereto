import { summarizeBusinessHours } from "@/lib/business/format-business-hours";

type Props = {
  address?: string | null;
  /** Business contact email — show only when curated in CMS. */
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  menuUrl?: string | null;
  bookingUrl?: string | null;
  serviceArea?: string | null;
  lat?: number | null;
  lng?: number | null;
  hours?: unknown;
};

function ensureHttpUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function telHref(phone: string): string | null {
  const core = phone.replace(/[^\d+]/g, "");
  return core.length >= 3 ? `tel:${core}` : null;
}

function hostnameLabel(raw: string): string {
  try {
    const u = new URL(ensureHttpUrl(raw));
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
  email,
  phone,
  website,
  menuUrl,
  bookingUrl,
  serviceArea,
  lat,
  lng,
  hours,
}: Props) {
  const addr = typeof address === "string" ? address.trim() : "";
  const phon = typeof phone === "string" ? phone.trim() : "";
  const mail = typeof email === "string" ? email.trim() : "";
  const svc = typeof serviceArea === "string" ? serviceArea.trim() : "";
  const menu = typeof menuUrl === "string" ? menuUrl.trim() : "";
  const booking = typeof bookingUrl === "string" ? bookingUrl.trim() : "";
  const site = typeof website === "string" ? website.trim() : "";

  const hoursText = summarizeBusinessHours(hours);

  let mapsHref: string | null = null;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  } else if (addr) {
    mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }

  const phoneLink = phon ? telHref(phon) : null;

  const primaryLocationLine = addr || svc;
  const hasLocationFacts = Boolean(primaryLocationLine || mapsHref);
  const hasAny =
    hasLocationFacts || phon || mail || hoursText || site || menu || booking;
  if (!hasAny) return null;

  return (
    <section
      aria-labelledby="business-quick-facts-heading"
      className="mt-6 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6"
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
                  <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{primaryLocationLine}</p>
                ) : mapsHref ? (
                  <p className="text-sm italic text-zinc-600">
                    Exact map coordinates on file—we&apos;re filling in street details when operators confirm them.
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
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-logo-navy)] underline-offset-4 hover:underline"
                    >
                      Open in Maps
                      <MsIcon name="north_east" className="!text-base text-[var(--color-logo-navy)]" />
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
              <h3 className="font-headline text-xs font-semibold uppercase tracking-wide text-zinc-500">Phone</h3>
              <p className="mt-1">
                {phoneLink ? (
                  <a
                    href={phoneLink}
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
              <h3 className="font-headline text-xs font-semibold uppercase tracking-wide text-zinc-500">Hours</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{hoursText}</p>
              <p className="mt-1.5 text-xs text-zinc-500">
                Hours can change anytime—please confirm close to your visit.
              </p>
            </div>
          </div>
        ) : null}

        {site ? (
          <div className="flex gap-3">
            <MsIcon name="language" className="!text-[22px]" />
            <div className="min-w-0 flex-1">
              <h3 className="font-headline text-xs font-semibold uppercase tracking-wide text-zinc-500">Website</h3>
              <p className="mt-1 break-all">
                <a
                  href={ensureHttpUrl(site)}
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

        {mail ? (
          <div className="flex gap-3">
            <MsIcon name="mail" className="!text-[22px]" />
            <div className="min-w-0 flex-1">
              <h3 className="font-headline text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</h3>
              <p className="mt-1 break-all">
                <a
                  href={`mailto:${encodeURIComponent(mail)}`}
                  className="text-sm font-semibold text-[var(--color-logo-navy)] underline-offset-4 hover:underline"
                >
                  {mail}
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
                    href={ensureHttpUrl(menu)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]/70 px-3 py-1.5 text-sm font-semibold text-zinc-800 transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
                  >
                    <MsIcon name="restaurant_menu" className="!text-lg text-[var(--color-primary)]" />
                    Menu
                  </a>
                </p>
              ) : null}
              {booking ? (
                <p>
                  <a
                    href={ensureHttpUrl(booking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]/70 px-3 py-1.5 text-sm font-semibold text-zinc-800 transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
                  >
                    <MsIcon name="event_available" className="!text-lg text-[var(--color-primary)]" />
                    Book
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
