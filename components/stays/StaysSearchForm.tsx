"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect, useRef } from "react";
import { captureEvent } from "@/lib/analytics/gtag-runner";
import { buildStaysSearchUrl, type RentalSearchPlan } from "@/lib/stays/search-params";
import { RENTAL_PROPERTY_TYPES } from "@/lib/stays/types";
import { PROPERTY_TYPE_LABELS } from "@/lib/stays/constants";

type TownOption = { id: string; slug: string; title: string };
type AreaOption = { id: string; slug: string; title: string };

type Props = {
  initial: RentalSearchPlan;
  towns: TownOption[];
  areas?: AreaOption[];
};

export function StaysSearchForm({ initial, towns, areas = [] }: Props) {
  const router = useRouter();
  const [town, setTown] = useState(initial.townSlug ?? "");
  const [area, setArea] = useState(initial.areaSlug ?? "");
  const [guests, setGuests] = useState(initial.guests?.toString() ?? "");
  const [bedrooms, setBedrooms] = useState(initial.bedrooms?.toString() ?? "");
  const [type, setType] = useState(initial.propertyType ?? "");
  const [pets, setPets] = useState(Boolean(initial.pets));
  const [pool, setPool] = useState(Boolean(initial.pool));
  const [gulfFront, setGulfFront] = useState(Boolean(initial.gulfFront));
  const [gulfView, setGulfView] = useState(Boolean(initial.gulfView));
  const [golfCart, setGolfCart] = useState(Boolean(initial.golfCart));
  const [privateBeach, setPrivateBeach] = useState(initial.beachAccess === "private");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    captureEvent("rental_search_started", {
      source: "hub",
      town_slug: initial.townSlug || undefined,
      guests: initial.guests || undefined,
    });
  }, [initial]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const plan: Partial<RentalSearchPlan> = {
      townSlug: town || undefined,
      areaSlug: area || undefined,
      guests: guests ? Number(guests) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      propertyType: type ? (type as RentalSearchPlan["propertyType"]) : undefined,
      pets: pets || undefined,
      pool: pool || undefined,
      gulfFront: gulfFront || undefined,
      gulfView: gulfView || undefined,
      golfCart: golfCart || undefined,
      beachAccess: privateBeach ? "private" : undefined,
      page: 1,
    };
    const url = buildStaysSearchUrl(plan);
    captureEvent("rental_search_completed", {
      town_slug: plan.townSlug,
      area_slug: plan.areaSlug,
      guests: plan.guests,
      bedrooms: plan.bedrooms,
      filter_keys: Object.keys(plan).filter((k) => k !== "page"),
    });
    router.push(url);
  }

  const field =
    "w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-700";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Town</span>
          <select className={field} value={town} onChange={(e) => setTown(e.target.value)}>
            <option value="">All 30A towns</option>
            {towns.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        {areas.length > 0 ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Neighborhood</span>
            <select className={field} value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Any neighborhood</option>
              {areas.map((a) => (
                <option key={a.id} value={a.slug}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Guests</span>
          <input
            type="number"
            min={1}
            max={50}
            className={field}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            placeholder="Any"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Bedrooms</span>
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            className={field}
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            placeholder="Any"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Property type</span>
          <select className={field} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Any</option>
            {RENTAL_PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROPERTY_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-zinc-800">
        {(
          [
            ["Pets OK", pets, setPets],
            ["Private pool", pool, setPool],
            ["Private beach", privateBeach, setPrivateBeach],
            ["Gulf front", gulfFront, setGulfFront],
            ["Gulf view", gulfView, setGulfView],
            ["Golf cart included", golfCart, setGolfCart],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => {
                set(e.target.checked);
                captureEvent("rental_filter_applied", { filter: label, value: e.target.checked });
              }}
            />
            {label}
          </label>
        ))}
      </div>

      <button
        type="submit"
        className="bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
      >
        Search stays
      </button>
    </form>
  );
}
