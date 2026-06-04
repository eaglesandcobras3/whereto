"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"button">, "type" | "onClick"> & {
  href: string;
};

/**
 * Navigates to `/search` or `/ask` without emitting a crawlable `<a href>` from
 * indexable pages (those paths are robots-disallowed).
 */
export function DiscoveryUtilityLink({ href, children, className, ...rest }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}
