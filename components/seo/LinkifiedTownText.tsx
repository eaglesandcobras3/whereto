import Link from "next/link";
import type { ReactNode } from "react";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { townPagePath } from "@/lib/routes/town-page-path";
import { findTownNameMatches } from "@/lib/seo/town-name-link-phrases";

type Props = {
  text: string;
  /** Skip linking the current town (avoids self-links on town detail pages). */
  excludeSlug?: string;
  /** When set, only slugs in this set become links (hides out-of-hub towns like Destin). */
  linkableSlugs?: ReadonlySet<string>;
  analyticsCategory?: string;
};

export function LinkifiedTownText({
  text,
  excludeSlug,
  linkableSlugs,
  analyticsCategory = "town_name_inline_link",
}: Props): ReactNode {
  const matches = findTownNameMatches(text, { excludeSlug, linkableSlugs });
  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }
    const href = townPagePath(match.slug);
    nodes.push(
      <Link
        key={`${match.start}-${match.slug}`}
        href={href}
        {...gaClickProps({
          event: "nav_click",
          category: analyticsCategory,
          label: match.slug,
        })}
        className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
      >
        {match.text}
      </Link>,
    );
    cursor = match.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
