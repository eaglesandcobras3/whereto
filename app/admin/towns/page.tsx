import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export default async function AdminTownsPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const { data: towns } = await supabase
    .from("towns")
    .select("id, name, slug, ai_tagline, hero_image_thumb_url")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Towns</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Edit town profile information and jump to town content.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Town</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Tagline</th>
              <th className="px-4 py-3">Thumb</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(towns ?? []).map((town) => (
              <tr key={town.id as number} className="border-b border-zinc-100">
                <td className="px-4 py-3 font-medium text-zinc-900">{town.name as string}</td>
                <td className="px-4 py-3 text-zinc-600">{town.slug as string}</td>
                <td className="px-4 py-3 text-zinc-600 line-clamp-1">
                  {(town.ai_tagline as string | null) ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {(town.hero_image_thumb_url as string | null) ? "Yes" : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/towns/${town.id}`}
                    className="text-sm font-semibold text-teal-700 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
