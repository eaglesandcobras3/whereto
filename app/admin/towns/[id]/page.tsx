import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { updateTownAction } from "../actions";

export default async function AdminTownEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const townId = Number(id);
  if (!Number.isFinite(townId)) notFound();

  const supabase = getServiceSupabase();
  const { data: town, error } = await supabase
    .from("towns")
    .select("id, name, slug, ai_tagline, ai_description, center_lat, center_lng, search_radius_meters")
    .eq("id", townId)
    .maybeSingle();

  if (error || !town) notFound();

  const { data: linkedContentEntry } = await supabase
    .from("content_entries")
    .select("id")
    .eq("content_type", "town")
    .eq("slug", String(town.slug))
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/towns" className="text-sm text-teal-700 hover:underline">
          ← Towns
        </Link>
        {linkedContentEntry?.id ? (
          <Link
            href={`/admin/content/${linkedContentEntry.id}`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit Town Content
          </Link>
        ) : (
          <Link
            href={`/admin/content?type=town`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Open Town Content List
          </Link>
        )}
      </div>

      <h1 className="text-2xl font-semibold text-zinc-900">Edit Town: {town.name as string}</h1>

      <form
        action={updateTownAction.bind(null, townId)}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Name</label>
            <input
              name="name"
              defaultValue={String(town.name ?? "")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Slug</label>
            <input
              name="slug"
              defaultValue={String(town.slug ?? "")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Tagline</label>
          <input
            name="ai_tagline"
            defaultValue={String(town.ai_tagline ?? "")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Description</label>
          <textarea
            name="ai_description"
            defaultValue={String(town.ai_description ?? "")}
            rows={5}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Center lat</label>
            <input
              name="center_lat"
              defaultValue={town.center_lat != null ? String(town.center_lat) : ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Center lng</label>
            <input
              name="center_lng"
              defaultValue={town.center_lng != null ? String(town.center_lng) : ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Search radius (m)</label>
            <input
              name="search_radius_meters"
              defaultValue={
                town.search_radius_meters != null ? String(town.search_radius_meters) : ""
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Save Town
        </button>
      </form>
    </div>
  );
}
