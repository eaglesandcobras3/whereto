import Link from "next/link";
import type { ReactNode } from "react";

const navLink =
  "text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]";

type Props = {
  children: ReactNode;
  active?: "dashboard" | "new" | "billing" | "account";
};

export function PortalShell({ children, active }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <header className="mb-10 border-b border-[var(--color-border)] pb-6">
        <p className="text-eyebrow text-[var(--color-text-tertiary)]">Business Portal</p>
        <h1 className="font-headline mt-1 text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
          Manage your listings
        </h1>
        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2" aria-label="Portal">
          <Link href="/portal" className={active === "dashboard" ? "text-sm font-semibold text-[var(--color-primary)]" : navLink}>
            My businesses
          </Link>
          <Link
            href="/portal/businesses/new"
            className={active === "new" ? "text-sm font-semibold text-[var(--color-primary)]" : navLink}
          >
            Add business
          </Link>
          <Link
            href="/portal/billing"
            className={active === "billing" ? "text-sm font-semibold text-[var(--color-primary)]" : navLink}
          >
            Billing
          </Link>
          <Link href="/profile" className={active === "account" ? "text-sm font-semibold text-[var(--color-primary)]" : navLink}>
            Account
          </Link>
          <Link href="/" className={navLink}>
            Back to site
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
