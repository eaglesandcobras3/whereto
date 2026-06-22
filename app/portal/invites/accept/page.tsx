import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PortalAcceptInviteClient } from "@/components/portal/PortalAcceptInviteClient";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalUser } from "@/lib/portal/require-portal-user";

export const metadata: Metadata = {
  title: "Accept invite",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function PortalAcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  const session = await requirePortalUser();
  if (!session) {
    const next = token
      ? `/portal/invites/accept?token=${encodeURIComponent(token)}`
      : "/portal/invites/accept";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <PortalShell>
      <h1 className="font-headline text-2xl font-semibold text-[var(--color-text-primary)]">Accept team invite</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-[var(--color-text-secondary)]">Loading…</p>}>
        <div className="mt-6">
          <PortalAcceptInviteClient />
        </div>
      </Suspense>
    </PortalShell>
  );
}
