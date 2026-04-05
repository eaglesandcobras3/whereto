import Link from "next/link";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";
import { TagPills } from "@/components/discovery/TagPills";

type Props = { enriched: EnrichedRecommendationPayload };

/** SEO-friendly vertical stack of picks (no prominent stars). */
export function TownRecListVertical({ enriched }: Props) {
  if (!enriched.recommendations.length) {
    return <p className="text-sm text-zinc-500">No listings match yet.</p>;
  }
  return (
    <ul className="space-y-5">
      {enriched.recommendations.map((r) => {
        const b = r.business as {
          name?: string;
          slug?: string;
          lat?: number;
          lng?: number;
          website?: string | null;
          tags?: string[];
        };
        const m = b.lat != null && b.lng != null;
        return (
          <li
            key={r.business_id}
            className="rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xl font-semibold tracking-tight text-zinc-900">
                  {b.name ?? "Business"}
                </p>
                <p className="text-sm font-medium text-[var(--accent)]">{r.headline}</p>
              </div>
              {b.slug ? (
                <Link
                  href={`/business/${b.slug}`}
                  className="shrink-0 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:border-[var(--accent)]/40"
                >
                  View
                </Link>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{r.explanation}</p>
            <TagPills tags={[...(r.highlighted_tags ?? []), ...(b.tags ?? [])]} />
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {m ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  Directions
                </a>
              ) : null}
              {b.website ? (
                <a
                  href={b.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  Website
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
