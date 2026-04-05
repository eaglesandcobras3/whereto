import Link from "next/link";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";
import { TagPills } from "@/components/discovery/TagPills";

type Props = { enriched: EnrichedRecommendationPayload };

/** Server-rendered picks (no save / feedback — consumer policy: no prominent stars). */
export function TownRecList({ enriched }: Props) {
  if (!enriched.recommendations.length) {
    return <p className="text-sm text-zinc-500">No listings match yet.</p>;
  }
  return (
    <ul className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
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
            className="min-w-[280px] max-w-sm shrink-0 snap-start rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-lg font-semibold text-zinc-900">
              {b.name ?? "Business"}
            </p>
            <p className="text-sm font-medium text-teal-800">{r.headline}</p>
            <p className="mt-2 text-sm text-zinc-700">{r.explanation}</p>
            <TagPills tags={[...(r.highlighted_tags ?? []), ...(b.tags ?? [])]} />
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {m ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 hover:underline"
                >
                  Directions
                </a>
              ) : null}
              {b.website ? (
                <a
                  href={b.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 hover:underline"
                >
                  Website
                </a>
              ) : null}
              {b.slug ? (
                <Link
                  href={`/business/${b.slug}`}
                  className="text-zinc-600 hover:underline"
                >
                  Details
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
