import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/businesses", label: "Businesses" },
    { href: "/admin/jobs", label: "Jobs" },
    { href: "/admin/ingestion", label: "Ingestion" },
    { href: "/admin/scores", label: "Scores" },
    { href: "/admin/duplicates", label: "Duplicates" },
  ];

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/admin" className="font-semibold text-teal-800">
            Admin
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-zinc-600 hover:text-teal-700 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="ml-auto text-sm text-zinc-500 hover:text-teal-700"
          >
            ← Public site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
