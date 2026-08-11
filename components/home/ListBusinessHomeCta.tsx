"use client";

import Link from "next/link";
import { isFreeOnboardEnabled, isOnboardEnabled } from "@/lib/feature-flags-core";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { PAGE_SECTION_CONTAINER_CLASS } from "@/lib/layout/page-section";

/**
 * Homepage call-to-action after the neighborhoods / towns strip.
 * Links to the public listing request flow (no markdown images — CSS only).
 */
export function ListBusinessHomeCta() {
  const flags = useAppFeatureFlags();
  const listHref =
    isFreeOnboardEnabled(flags) || !isOnboardEnabled(flags)
      ? "/list-your-business"
      : "/portal/businesses/new";

  return (
    <section
      id="section-list-your-business"
      aria-labelledby="home-list-business-heading"
      className="relative py-16 md:py-24"
    >
      <div className={PAGE_SECTION_CONTAINER_CLASS}>
        <div className="overflow-hidden rounded-2xl bg-[var(--color-logo-navy)]">
          <div className="p-8 md:p-12 lg:p-14">
            <p className="text-eyebrow mb-3 text-white">For local businesses</p>
            <h2
              id="home-list-business-heading"
              className="max-w-3xl font-headline text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl"
            >
              Verify your listing. Earn your verified badge
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
              Already on WhereTo30A? Verify your listing to get the verified badge on your business
              profile — so travelers and locals know the details come from you.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
              We review every submission before anything goes live, with the same thoughtful
              standards as the rest of the guide.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={listHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[var(--color-logo-navy)] transition-colors hover:bg-white/90 sm:w-auto md:text-base"
              >
                <span className="material-symbols-outlined !text-xl" aria-hidden>
                  verified
                </span>
                Verify your listing
              </Link>
              <Link
                href={listHref}
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/35 bg-transparent px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10 sm:w-auto md:text-base"
              >
                Add a new business
              </Link>
            </div>

            <dl className="mt-10 max-w-2xl space-y-5 text-sm">
              <div className="flex gap-3">
                <span
                  className="material-symbols-outlined mt-0.5 shrink-0 text-white"
                  aria-hidden
                >
                  verified
                </span>
                <div>
                  <dt className="font-semibold text-white">Verified badge</dt>
                  <dd className="mt-1 leading-relaxed text-white/70">
                    Show on your profile that the listing is owner-verified — a clear signal for
                    people planning their trip.
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <span
                  className="material-symbols-outlined mt-0.5 shrink-0 text-white"
                  aria-hidden
                >
                  storefront
                </span>
                <div>
                  <dt className="font-semibold text-white">Not listed yet?</dt>
                  <dd className="mt-1 leading-relaxed text-white/70">
                    Add your business to the guide, then verify it so your profile earns the badge.
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <span
                  className="material-symbols-outlined mt-0.5 shrink-0 text-white"
                  aria-hidden
                >
                  handshake
                </span>
                <div>
                  <dt className="font-semibold text-white">Human review</dt>
                  <dd className="mt-1 leading-relaxed text-white/70">
                    We check every request so the guide stays trustworthy for neighbors and
                    vacationers alike.
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
