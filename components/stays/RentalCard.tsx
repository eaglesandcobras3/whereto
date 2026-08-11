import Link from "next/link";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { PROPERTY_TYPE_LABELS, staysPropertyPath } from "@/lib/stays/constants";
import type { RentalPropertyView } from "@/lib/stays/types";
import { cn } from "@/lib/utils";

type Props = {
  property: RentalPropertyView;
  position?: number;
  className?: string;
};

export function RentalCard({ property, position, className }: Props) {
  const href = staysPropertyPath(property.slug);
  const image = property.hero_image_url || property.primary_image_url;
  const typeLabel = PROPERTY_TYPE_LABELS[property.property_type] ?? property.property_type;

  return (
    <article className={cn("group", className)}>
      <Link
        href={href}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
        {...gaClickProps({
          event: "rental_result_viewed",
          category: "stays_results",
          label: property.id,
        })}
        data-analytics-property-id={property.id}
        data-analytics-position={position ?? undefined}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
          <RemoteCoverImage
            src={image}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
            placeholderIcon="home"
          />
          {property.featured ? (
            <span className="absolute left-3 top-3 z-10 bg-white/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-800">
              Curated
            </span>
          ) : null}
        </div>
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
            {property.town_title ?? "30A"}
            {property.area_title ? ` · ${property.area_title}` : ""}
          </p>
          <h3 className="mt-1 font-headline text-lg font-semibold leading-snug text-zinc-900 group-hover:text-teal-900">
            {property.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            {property.bedrooms} bed · {property.bathrooms} bath · Sleeps {property.sleeps}
            {typeLabel ? ` · ${typeLabel}` : ""}
          </p>
          {property.pricing_reliable && property.starting_nightly_rate != null ? (
            <p className="mt-1 text-sm text-zinc-700">
              From ${Number(property.starting_nightly_rate).toFixed(0)} / night
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
