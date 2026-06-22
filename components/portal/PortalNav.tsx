"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navLink =
  "text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]";

type Props = {
  active?: "dashboard" | "new" | "billing" | "account";
};

export function PortalNav({ active }: Props) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch("/api/portal/me")
      .then(async (res) => {
        const j = (await res.json()) as { isOwner?: boolean };
        if (res.ok) setIsOwner(Boolean(j.isOwner));
      })
      .catch(() => {});
  }, []);

  return (
    <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2" aria-label="Portal">
      <Link
        href="/portal"
        className={active === "dashboard" ? "text-sm font-semibold text-[var(--color-primary)]" : navLink}
      >
        My businesses
      </Link>
      <Link
        href="/portal/businesses/new"
        className={active === "new" ? "text-sm font-semibold text-[var(--color-primary)]" : navLink}
      >
        Add business
      </Link>
      {isOwner ? (
        <Link
          href="/portal/billing"
          className={active === "billing" ? "text-sm font-semibold text-[var(--color-primary)]" : navLink}
        >
          Billing
        </Link>
      ) : null}
      <Link
        href="/profile"
        className={active === "account" ? "text-sm font-semibold text-[var(--color-primary)]" : navLink}
      >
        Account
      </Link>
      <a href="mailto:hello@whereto30a.com" className={navLink}>
        Support
      </a>
      <Link href="/" className={navLink}>
        Back to site
      </Link>
    </nav>
  );
}
