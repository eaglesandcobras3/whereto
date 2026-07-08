import Image from "next/image";
import Link from "next/link";
import type { MarkdownBusinessCardData } from "@/lib/data/markdown-business-cards";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  slug: string;
  /** Text after `—` on the `[[slug]]` line; shown as the card blurb when set. */
  markdownNote?: string;
  business: MarkdownBusinessCardData | undefined;
};

export function MarkdownBusinessCard({ slug, markdownNote, business }: Props) {
  const href = `/business/${business?.slug ?? slug}`;
  const thumb = business ? businessListingImageUrl(business.hero_image_url) : null;
  const note = markdownNote?.trim();
  const blurb =
    (note && note.length > 0 ? note : null) ??
    business?.ai_one_liner?.trim() ??
    null;
  const title = business?.name ?? slug.replace(/-/g, " ");

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-premium-sm transition-shadow hover:shadow-md">
      <Link
        href={href}
        {...gaClickProps({
          event: "nav_click",
          category: "markdown_card",
          label: business?.slug ?? slug,
        })}
        className="group flex gap-4 p-4 sm:gap-5 sm:p-5"
      >
        {thumb ? (
          <Image
            src={thumb}
            alt={title}
            width={96}
            height={144}
            loading="lazy"
            className="aspect-[2/3] w-20 shrink-0 rounded-xl object-cover sm:w-24"
          />
        ) : (
          <div className="flex aspect-[2/3] w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 sm:w-24">
            <span className="material-symbols-outlined !text-3xl">storefront</span>
          </div>
        )}
        <div className="min-w-0 flex-1 py-0.5">
          <p className="font-headline text-lg font-bold leading-snug text-zinc-900 sm:text-xl">{title}</p>
          {business?.town_name ? (
            <p className="mt-0.5 text-sm font-medium text-teal-700">{business.town_name}</p>
          ) : null}
          {blurb ? <p className="mt-2 text-base leading-relaxed text-zinc-600">{blurb}</p> : null}
          {!business ? (
            <p className="mt-2 text-sm text-amber-800">Listing data not found; link may still work.</p>
          ) : null}
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-800">
            View listing
            <span className="material-symbols-outlined !text-base transition-transform group-hover:translate-x-0.5">
              arrow_forward
            </span>
          </span>
        </div>
      </Link>
    </div>
  );
}
