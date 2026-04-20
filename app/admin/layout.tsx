import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/site-settings", label: "Site settings" },
    { href: "/admin/content", label: "Content" },
    { href: "/admin/content-model", label: "Content model" },
    { href: "/admin/media", label: "Media" },
    { href: "/admin/businesses", label: "Businesses" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/jobs", label: "Jobs" },
    { href: "/admin/feature-flags", label: "Feature flags" },
    { href: "/admin/cache", label: "Cache" },
    { href: "/admin/advanced", label: "Advanced tools" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)]">
      <header className="glass-nav border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 md:px-6">
          <Link
            href="/admin"
            prefetch={false}
            className="font-headline text-sm font-bold tracking-tight text-[var(--color-primary)]"
          >
            Admin
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm md:gap-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="rounded-md px-2 py-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="ml-auto text-sm font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
          >
            ← Public site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
