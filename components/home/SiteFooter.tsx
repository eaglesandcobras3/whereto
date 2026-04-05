import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200/80 bg-[var(--surface-elevated)] px-4 py-14">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            WhereTo30A
          </p>
          <p className="text-sm leading-relaxed text-zinc-600">
            WhereTo30A is an AI-assisted local guide for Florida&apos;s 30A corridor —
            curated listings, natural-language search, and town-by-town picks. We
            prioritize clarity and trust: summaries and tags instead of noisy review
            walls.
          </p>
        </div>
        <nav
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--accent)] sm:justify-start"
          aria-label="Footer"
        >
          <Link href="/30a" className="hover:underline">
            Region overview
          </Link>
          <Link href="/rosemary-beach" className="hover:underline">
            Rosemary Beach
          </Link>
          <Link href="/seaside" className="hover:underline">
            Seaside
          </Link>
          <Link href="/alys-beach" className="hover:underline">
            Alys Beach
          </Link>
          <Link href="/grayton-beach" className="hover:underline">
            Grayton Beach
          </Link>
          <Link href="/saved" className="hover:underline">
            Saved places
          </Link>
        </nav>
        <p className="text-center text-xs text-zinc-400 sm:text-left">
          © {new Date().getFullYear()} WhereTo30A. Discover the Emerald Coast with one
          search.
        </p>
      </div>
    </footer>
  );
}
