import type { ReactNode } from "react";
import { PortalNav } from "@/components/portal/PortalNav";

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
        <PortalNav active={active} />
      </header>
      {children}
    </div>
  );
}
