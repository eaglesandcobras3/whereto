"use client";

import { useCallback, useState } from "react";
import { useAdminDebouncedSearch } from "@/lib/admin/use-admin-debounced-search";
import {
  DEFAULT_PLANT_WINDOW_DAYS,
  PLANT_WINDOW_DAYS,
} from "@/lib/community-tips/schedule";
import {
  COMMUNITY_TIP_BODY_MAX,
  COMMUNITY_TIP_BODY_MIN,
  COMMUNITY_TIP_ENTITY_TYPES,
  type CommunityTipEntityType,
} from "@/lib/community-tips/schema";
import { entityTypeLabel } from "@/lib/community-tips/attribution";

type EntityHit = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
};

type Props = {
  onPlanted: (result: { schedule: "now" | "random_future" }) => void;
};

export function CommunityTipPlantForm({ onPlanted }: Props) {
  const [entityType, setEntityType] = useState<CommunityTipEntityType>("business");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<EntityHit[]>([]);
  const [selected, setSelected] = useState<EntityHit | null>(null);
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState("");
  const [schedule, setSchedule] = useState<"now" | "random_future">("random_future");
  const [windowDays, setWindowDays] = useState<number>(DEFAULT_PLANT_WINDOW_DAYS);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSearch = useCallback(
    async (trimmedQuery: string, signal: AbortSignal) => {
      const res = await fetch(
        `/api/admin/community-tips/entities?entity_type=${encodeURIComponent(entityType)}&q=${encodeURIComponent(trimmedQuery)}`,
        { signal },
      );
      if (!res.ok) {
        if (!signal.aborted) setHits([]);
        return;
      }
      const json = (await res.json()) as { results?: EntityHit[] };
      if (!signal.aborted) setHits(json.results ?? []);
    },
    [entityType],
  );

  const onClear = useCallback(() => {
    setHits([]);
  }, []);

  const { loading: searching } = useAdminDebouncedSearch({
    query: selected ? "" : query,
    onSearch,
    onClear,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setStatus("error");
      setMessage("Pick a place first.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const res = await fetch("/api/admin/community-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "plant",
        entity_type: entityType,
        entity_id: selected.id,
        body,
        attribution_city: city,
        rating: rating === "" ? null : Number(rating),
        schedule,
        window_days: schedule === "random_future" ? windowDays : undefined,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      tip?: { created_at?: string };
    };
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error || "Could not plant tip.");
      return;
    }
    const stamp = json.tip?.created_at ? new Date(json.tip.created_at) : null;
    setStatus("ok");
    setMessage(
      stamp
        ? schedule === "now"
          ? "Planted and live now."
          : `Planted — goes live ${stamp.toLocaleString()}.`
        : "Planted.",
    );
    setBody("");
    setRating("");
    onPlanted({ schedule });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Plant a tip</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Write it now. Stamp a random time in the next few days so a batch does not all go live at
        once.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-zinc-600">
          Type
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value as CommunityTipEntityType);
              setSelected(null);
              setQuery("");
              setHits([]);
            }}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          >
            {COMMUNITY_TIP_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {entityTypeLabel(t)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-zinc-600">
          Place
          {selected ? (
            <span className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900">
              <span className="min-w-0 truncate">
                {selected.title}
                {selected.subtitle ? (
                  <span className="text-zinc-500"> · {selected.subtitle}</span>
                ) : null}
              </span>
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-teal-800 hover:underline"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
              >
                Change
              </button>
            </span>
          ) : (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${entityTypeLabel(entityType).toLowerCase()}s…`}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          )}
        </label>
      </div>

      {!selected && (searching || hits.length > 0) ? (
        <ul className="mt-2 max-h-48 overflow-auto rounded-lg border border-zinc-200">
          {searching ? (
            <li className="px-3 py-2 text-sm text-zinc-500">Searching…</li>
          ) : (
            hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                  onClick={() => {
                    setSelected(hit);
                    setQuery("");
                    setHits([]);
                  }}
                >
                  <span className="font-medium text-zinc-900">{hit.title}</span>
                  {hit.subtitle ? (
                    <span className="ml-2 text-zinc-500">{hit.subtitle}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      <label className="mt-3 block text-sm text-zinc-600">
        Tip
        <textarea
          required
          minLength={COMMUNITY_TIP_BODY_MIN}
          maxLength={COMMUNITY_TIP_BODY_MAX}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-zinc-600">
          City they’re from
          <input
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Birmingham"
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </label>
        <label className="block text-sm text-zinc-600">
          Stars <span className="font-normal text-zinc-400">(optional)</span>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          >
            <option value="">No rating</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-zinc-700">When it appears</legend>
        <div className="mt-2 space-y-2 text-sm text-zinc-700">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="schedule"
              checked={schedule === "random_future"}
              onChange={() => setSchedule("random_future")}
            />
            Random time in the next
            <select
              value={windowDays}
              disabled={schedule !== "random_future"}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="rounded-md border border-zinc-300 px-2 py-1 text-zinc-900 disabled:opacity-50"
            >
              {PLANT_WINDOW_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d} day{d === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="schedule"
              checked={schedule === "now"}
              onChange={() => setSchedule("now")}
            />
            Publish now
          </label>
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {status === "loading" ? "Planting…" : "Plant tip"}
        </button>
        {message ? (
          <p className={`text-sm ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
