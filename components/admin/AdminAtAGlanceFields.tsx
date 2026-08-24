"use client";

import type { AdminAtAGlanceValues } from "@/lib/admin/admin-at-a-glance-form";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10";
const labelClass = "block text-sm font-medium text-zinc-700";

type Props = {
  values: AdminAtAGlanceValues;
  onChange: (values: AdminAtAGlanceValues) => void;
  placeLabel: "town" | "area";
};

function patchField<K extends keyof AdminAtAGlanceValues>(
  values: AdminAtAGlanceValues,
  onChange: (values: AdminAtAGlanceValues) => void,
  key: K,
  next: AdminAtAGlanceValues[K],
) {
  onChange({ ...values, [key]: next });
}

/** Full at-a-glance editor matching the public place profile section. */
export function AdminAtAGlanceFields({ values, onChange, placeLabel }: Props) {
  return (
    <fieldset className="space-y-5 rounded-xl border border-zinc-200 p-4">
      <legend className="px-1 text-sm font-semibold text-zinc-900">At a glance</legend>
      <p className="text-xs text-zinc-500">
        Powers the &ldquo;{placeLabel} at a glance&rdquo; block on the public page — intro, three
        metric cards, highlight chips, and detail cards. Required fields for the section to appear:
        description, walkability, beach access, getting around, dining &amp; town center, and
        parking.
      </p>

      <label className={labelClass}>
        Intro description
        <textarea
          className={inputClass}
          rows={3}
          value={values.at_a_glance_description}
          onChange={(e) => patchField(values, onChange, "at_a_glance_description", e.target.value)}
          placeholder="Short editorial summary shown under the section heading"
        />
      </label>

      <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Metric cards</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Walkability (headline)
            <input
              className={inputClass}
              value={values.walkability_rating}
              onChange={(e) => patchField(values, onChange, "walkability_rating", e.target.value)}
              placeholder="e.g. Very walkable"
            />
          </label>
          <label className={labelClass}>
            Walkability subtext
            <input
              className={inputClass}
              value={values.walkability_subtext}
              onChange={(e) => patchField(values, onChange, "walkability_subtext", e.target.value)}
              placeholder="Supporting detail under the headline"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Beach access (headline)
            <input
              className={inputClass}
              value={values.beach_type}
              onChange={(e) => patchField(values, onChange, "beach_type", e.target.value)}
              placeholder="e.g. Short walk to Gulf"
            />
          </label>
          <label className={labelClass}>
            Beach access subtext
            <input
              className={inputClass}
              value={values.beach_type_subtext}
              onChange={(e) => patchField(values, onChange, "beach_type_subtext", e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Getting around (headline)
            <input
              className={inputClass}
              value={values.getting_around_summary}
              onChange={(e) => patchField(values, onChange, "getting_around_summary", e.target.value)}
              placeholder="e.g. Bike-friendly"
            />
          </label>
          <label className={labelClass}>
            Getting around subtext
            <input
              className={inputClass}
              value={values.getting_around_subtext}
              onChange={(e) => patchField(values, onChange, "getting_around_subtext", e.target.value)}
            />
          </label>
        </div>
      </div>

      <label className={labelClass}>
        Highlights
        <textarea
          className={inputClass}
          rows={4}
          value={values.highlightsText}
          onChange={(e) => patchField(values, onChange, "highlightsText", e.target.value)}
          placeholder={"One per line (or pipe-separated)\ne.g. boutique shopping\nwalkable"}
        />
        <span className="mt-1 block text-xs text-zinc-500">Up to 20 chips on the public page.</span>
      </label>

      <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Detail cards</p>

        <label className={labelClass}>
          Dining &amp; town center
          <textarea
            className={inputClass}
            rows={3}
            value={values.dining_town_center_details}
            onChange={(e) =>
              patchField(values, onChange, "dining_town_center_details", e.target.value)
            }
          />
        </label>

        <label className={labelClass}>
          Parking
          <textarea
            className={inputClass}
            rows={3}
            value={values.parking_details}
            onChange={(e) => patchField(values, onChange, "parking_details", e.target.value)}
          />
        </label>

        <label className={labelClass}>
          Beach access details (extended)
          <textarea
            className={inputClass}
            rows={2}
            value={values.beach_access_details}
            onChange={(e) => patchField(values, onChange, "beach_access_details", e.target.value)}
          />
        </label>

        <label className={labelClass}>
          Getting around details (extended)
          <textarea
            className={inputClass}
            rows={2}
            value={values.getting_around_details}
            onChange={(e) => patchField(values, onChange, "getting_around_details", e.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Dining rating (legacy)
            <input
              className={inputClass}
              value={values.dining_rating}
              onChange={(e) => patchField(values, onChange, "dining_rating", e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Dining subtext (legacy)
            <input
              className={inputClass}
              value={values.dining_subtext}
              onChange={(e) => patchField(values, onChange, "dining_subtext", e.target.value)}
            />
          </label>
        </div>
      </div>
    </fieldset>
  );
}
