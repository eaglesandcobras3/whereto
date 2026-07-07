"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Member = { user_id: string; role: string; email: string | null };
type Invite = { id: string; email: string; expires_at: string };

type Props = {
  businessId: string;
  businessTitle: string;
};

export function PortalTeamClient({ businessId, businessTitle }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/portal/businesses/${encodeURIComponent(businessId)}/team`)
      .then(async (res) => {
        const j = (await res.json()) as {
          members?: Member[];
          invites?: Invite[];
          can_manage?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        setMembers(j.members ?? []);
        setInvites(j.invites ?? []);
        setCanManage(Boolean(j.can_manage));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setPending(true);
    setErr(null);
    const res = await fetch(`/api/portal/businesses/${encodeURIComponent(businessId)}/team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const j = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setErr(j.error ?? "Could not send invite.");
      return;
    }
    setEmail("");
    load();
  }

  async function revoke(inviteId: string) {
    setErr(null);
    const res = await fetch(
      `/api/portal/businesses/${encodeURIComponent(businessId)}/team?invite_id=${encodeURIComponent(inviteId)}`,
      { method: "DELETE" },
    );
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      setErr(j.error ?? "Could not revoke invite.");
      return;
    }
    load();
  }

  async function removeMember(userId: string) {
    setErr(null);
    const res = await fetch(
      `/api/portal/businesses/${encodeURIComponent(businessId)}/team?user_id=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      setErr(j.error ?? "Could not remove manager.");
      return;
    }
    load();
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading team…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/portal" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
          ← Dashboard
        </Link>
        <Link
          href={`/portal/businesses/${encodeURIComponent(businessId)}`}
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Edit listing
        </Link>
      </div>

      <h1 className="font-headline mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">
        Team for {businessTitle}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Managers can edit listing details and upload photos. Only owners can manage billing and invites.
      </p>

      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

      <section className="mt-8">
        <h2 className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">Members</h2>
        <ul className="mt-4 space-y-3">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{m.email ?? m.user_id}</p>
                <p className="text-xs capitalize text-[var(--color-text-tertiary)]">{m.role}</p>
              </div>
              {canManage && m.role === "manager" ? (
                <button
                  type="button"
                  onClick={() => removeMember(m.user_id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {invites.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">Pending invites</h2>
          <ul className="mt-4 space-y-3">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3"
              >
                <div>
                  <p className="text-sm text-[var(--color-text-primary)]">{inv.email}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => revoke(inv.id)}
                    className="text-sm text-[var(--color-text-secondary)] hover:underline"
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canManage ? (
        <form onSubmit={sendInvite} className="mt-8 space-y-4 rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">Invite a manager</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            They&apos;ll receive an email with a link to accept. Invites expire after 7 days.
          </p>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]" htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-[var(--color-border-strong)] px-3 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send invite"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
