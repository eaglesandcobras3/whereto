import Link from "next/link";
import type { PortalAccountSummary } from "@/lib/portal/load-portal-account-summary";

type Props = {
  summary: PortalAccountSummary;
};

export function ProfileBusinessPortalSection({ summary }: Props) {
  const { businessCount, pendingCount, businesses } = summary;

  return (
    <section className="border-t border-zinc-100 pt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Business listings</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Manage claims, new listings, and edits in the Business Portal. You can still browse the site as a visitor
        anytime.
      </p>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-zinc-500">Businesses you manage</dt>
            <dd className="mt-0.5 text-lg font-semibold text-zinc-900">{businessCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500">Awaiting review</dt>
            <dd className="mt-0.5 text-lg font-semibold text-zinc-900">{pendingCount}</dd>
          </div>
        </dl>

        {businesses.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-zinc-200/80 pt-4">
            {businesses.slice(0, 5).map((biz) => (
              <li key={biz.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-zinc-900">{biz.title}</span>
                <Link
                  href={`/portal/businesses/${encodeURIComponent(biz.id)}`}
                  className="shrink-0 font-medium text-[var(--color-primary)] hover:underline"
                >
                  Manage
                </Link>
              </li>
            ))}
            {businesses.length > 5 ? (
              <li className="text-xs text-zinc-500">+ {businesses.length - 5} more in the portal</li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-4 border-t border-zinc-200/80 pt-4 text-sm text-zinc-600">
            Submissions awaiting approval will appear here once a listing is live.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/portal"
            className="inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Open Business Portal
          </Link>
          <Link
            href="/portal/businesses/new"
            className="inline-flex rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            List your business
          </Link>
        </div>
      </div>
    </section>
  );
}
