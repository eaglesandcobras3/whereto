"use client";

import { Popover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

export const VERIFIED_BADGE_TOOLTIP =
  "The owner has verified the information in this profile and if you have a business you can do the same by going to the profile or adding a new one.";

type Props = {
  className?: string;
};

/**
 * Owner-verified listing mark shown inline with the business title.
 * Uses a popover (hover + tap) so the explanation works on mobile as well as desktop.
 */
export function VerifiedBadge({ className }: Props) {
  return (
    <Popover.Root modal={false}>
      <Popover.Trigger
        openOnHover
        delay={200}
        closeDelay={100}
        aria-label={VERIFIED_BADGE_TOOLTIP}
        className={cn(
          "verified-badge relative inline-flex shrink-0 items-center justify-center",
          "h-[0.85em] w-[0.85em] rounded-full bg-[#1a73e8] text-white",
          "align-middle outline-none transition-opacity hover:opacity-90",
          "focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 focus-visible:ring-offset-2",
          className,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[62%] w-[62%]"
          fill="none"
        >
          <path
            d="M6.5 12.5 10 16l7.5-8"
            stroke="currentColor"
            strokeWidth="3.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
              "max-w-[min(18.5rem,calc(100vw-1.5rem))] rounded-lg border border-zinc-200",
              "bg-white px-3 py-2.5 text-left text-sm leading-snug text-zinc-700 shadow-lg",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            <Popover.Description className="m-0 text-sm leading-snug text-zinc-700">
              {VERIFIED_BADGE_TOOLTIP}
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
