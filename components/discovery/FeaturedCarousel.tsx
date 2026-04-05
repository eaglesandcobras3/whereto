import Link from "next/link";
import type { HomeFeaturedBusiness } from "@/lib/data/home-features";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { TagPills } from "@/components/discovery/TagPills";

function gradientForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 1)) % 360;
  const palettes = [
    "from-sky-100/90 via-cyan-50/80 to-teal-100/70",
    "from-amber-50/90 via-orange-50/70 to-rose-100/60",
    "from-emerald-50/90 via-teal-50/70 to-cyan-100/60",
    "from-violet-50/80 via-slate-50/70 to-sky-100/60",
  ];
  return palettes[h % palettes.length];
}

type Props = {
  title: string;
  subtitle?: string;
  businesses: HomeFeaturedBusiness[];
};

export function FeaturedCarousel({ title, subtitle, businesses }: Props) {
  if (!businesses.length) return null;
  return (
    <SectionBlock title={title} subtitle={subtitle}>
      <ul className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory">
        {businesses.map((b) => (
          <li
            key={b.id}
            className="min-w-[min(280px,85vw)] max-w-sm shrink-0 snap-start"
          >
            <Link
              href={`/business/${b.slug}`}
              className="block overflow-hidden rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] shadow-sm transition hover:border-[var(--accent)]/40 hover:shadow-md"
            >
              <div
                className={`h-28 bg-gradient-to-br ${gradientForSlug(b.slug)}`}
                aria-hidden
              />
              <div className="space-y-2 p-4">
                <p className="text-base font-semibold tracking-tight text-zinc-900">
                  {b.name}
                </p>
                <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600">
                  {b.ai_summary?.trim() || "A local favorite along 30A."}
                </p>
                <TagPills tags={b.tagSlugs.slice(0, 5)} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
