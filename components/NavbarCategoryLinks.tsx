"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function navLinkClass(active: boolean) {
  const base =
    "inline-flex items-center px-3 py-2 text-sm font-semibold tracking-tight font-headline border-b-2 transition-premium-fast";
  return active
    ? `${base} text-[var(--color-primary)] border-[var(--color-primary)]`
    : `${base} text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-outline-variant)] hover:text-[var(--color-primary)]`;
}

export function NavbarCategoryLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const isSearch = pathname === "/search";

  const links = [
    { label: "Towns", href: "/search?type=towns", isActive: isSearch && type === "towns" },
    { label: "Stores", href: "/search?type=stores", isActive: isSearch && type === "stores" },
    { label: "Services", href: "/search?type=services", isActive: isSearch && type === "services" },
    { label: "Events", href: "/search?type=events", isActive: isSearch && type === "events" },
    { label: "Guides", href: "/search?type=guides", isActive: isSearch && type === "guides" },
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className={`hidden sm:inline-flex ${navLinkClass(link.isActive)}`}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
