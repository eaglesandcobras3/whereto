import Link from "next/link";

const townLinks = [
  { name: "Rosemary Beach", href: "/rosemary-beach" },
  { name: "Seaside", href: "/seaside" },
  { name: "Alys Beach", href: "/alys-beach" },
  { name: "Grayton Beach", href: "/grayton-beach" },
  { name: "WaterColor", href: "/watercolor" },
  { name: "Santa Rosa Beach", href: "/santa-rosa-beach" },
  { name: "Destin", href: "/destin" },
  { name: "Panama City Beach", href: "/panama-city-beach" },
];

const exploreLinks = [
  { name: "All towns", href: "/30a" },
  { name: "Restaurants", href: "/?q=best+restaurants+on+30A" },
  { name: "Coffee", href: "/?q=best+coffee+on+30A" },
  { name: "Things to do", href: "/?q=things+to+do+on+30A" },
  { name: "Saved places", href: "/saved" },
];

const companyLinks = [
  { name: "About", href: "/about" },
  { name: "Privacy", href: "/privacy" },
  { name: "Terms", href: "/terms" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {/* Main footer content */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-headline text-lg font-extrabold tracking-tighter text-[var(--color-brand-wordmark)] md:text-xl">
                WhereTo30A
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Your AI-powered local guide for Florida&apos;s Emerald Coast.
              Curated listings, natural-language search, and town-by-town picks.
            </p>
          </div>

          {/* Towns */}
          <div>
            <h3 className="text-eyebrow mb-4">Towns</h3>
            <ul className="space-y-2">
              {townLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-eyebrow mb-4">Explore</h3>
            <ul className="space-y-2">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter / Company */}
          <div className="space-y-6">
            <div>
              <h3 className="text-eyebrow mb-4">Stay updated</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Get the best local picks in your inbox.
              </p>
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  className="flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-light)] transition-colors"
                >
                  Join
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-eyebrow mb-3">Company</h3>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            © {new Date().getFullYear()} WhereTo30A. Discover the Emerald Coast
            with one search.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--color-text-tertiary)]">
              Built with AI
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
