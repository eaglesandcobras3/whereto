import Link from "next/link";

type Props = {
  onboardEnabled: boolean;
  freeOnboardEnabled?: boolean;
};

export function ProfileListBusinessCta({ onboardEnabled, freeOnboardEnabled }: Props) {
  const href =
    freeOnboardEnabled || !onboardEnabled ? "/list-your-business" : "/portal/businesses/new";

  return (
    <section className="border-t border-zinc-100 pt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">For business owners</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Have a storefront or service along 30A? Request a listing — we review every submission before it goes live.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        List your business
      </Link>
    </section>
  );
}
