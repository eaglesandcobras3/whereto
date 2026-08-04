"use client";

import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Prefill update flow for this listing (e.g. `/list-your-business?business=slug`). */
  updateListingHref?: string;
  /** Start a brand-new listing. */
  listBusinessHref?: string;
};

/**
 * Owner-verified listing mark shown inline with the business title.
 * Uses a popover (hover + tap) so the explanation works on mobile as well as desktop.
 */
export function VerifiedBadge({
  className,
  updateListingHref,
  listBusinessHref = "/list-your-business",
}: Props) {
  const linkCn =
    "font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950";

  return (
    <Popover.Root modal={false}>
      <Popover.Trigger
        openOnHover
        delay={150}
        closeDelay={200}
        aria-label="Owner verified"
        className={cn(
          "verified-badge inline-flex shrink-0 items-center gap-1 self-center",
          "rounded-full border border-emerald-200 bg-emerald-50",
          "px-2.5 py-1 text-xs font-semibold tracking-tight text-emerald-800",
          "align-middle outline-none transition-colors hover:bg-emerald-100/80",
          "focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2",
          className,
        )}
      >
        <span
          className="material-symbols-outlined !text-base text-emerald-600"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20" }}
          aria-hidden
        >
          check_circle
        </span>
        Owner verified
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 outline-none"
        >
          <Popover.Popup
            className={cn(
              "max-w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-200",
              "bg-white px-3.5 py-3 text-left shadow-lg",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            <Popover.Title className="m-0 text-sm font-semibold text-zinc-900">
              Owner verified
            </Popover.Title>
            <div className="mt-1.5 text-sm leading-relaxed text-zinc-600">
              <p className="m-0">
                This profile has been verified by the business owner. Own a business on 30A?{" "}
                {updateListingHref ? (
                  <>
                    Visit your business profile to{" "}
                    <Link href={updateListingHref} className={linkCn}>
                      submit an update
                    </Link>
                    , or use the{" "}
                    <Link href={listBusinessHref} className={linkCn}>
                      List Your Business
                    </Link>{" "}
                    form to add your business to earn this badge.
                  </>
                ) : (
                  <>
                    Use the{" "}
                    <Link href={listBusinessHref} className={linkCn}>
                      List Your Business
                    </Link>{" "}
                    form to add your business to earn this badge.
                  </>
                )}
              </p>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
