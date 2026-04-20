import { requireAdmin } from "@/lib/admin/require-admin";
import { listFieldGroups } from "@/lib/data/field-groups";
import { addFieldDefinitionAction, addFieldGroupAction } from "./actions";

const FIELD_TYPES = [
  "text",
  "textarea",
  "richtext",
  "number",
  "boolean",
  "date",
  "select",
  "image",
  "gallery",
  "relationship",
  "repeater",
] as const;

export default async function ContentModelPage() {
  await requireAdmin();
  const groups = await listFieldGroups();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Content Model</h1>
        <p className="mt-1 text-sm text-zinc-600">
          ACF-style field group builder. Add fields without new migrations.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Add Field Group</h2>
        <form action={addFieldGroupAction} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input
            name="group_key"
            placeholder="group_key (ex: guide_highlights)"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="group_label"
            placeholder="Group label"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="applies_to_csv"
            placeholder="Applies to (csv: guide,town,page)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Create Group
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        {groups.map((g) => (
          <div key={g.id as number} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="font-semibold text-zinc-900">
                {(g.group_label as string) ?? "Group"}{" "}
                <span className="font-mono text-xs text-zinc-500">({g.group_key as string})</span>
              </p>
              <p className="text-xs text-zinc-500">
                Applies to: {Array.isArray(g.applies_to) && g.applies_to.length > 0 ? g.applies_to.join(", ") : "any"}
              </p>
            </div>

            <div className="mb-4 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Key</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {Array.isArray(g.field_definitions) && g.field_definitions.length > 0 ? (
                    g.field_definitions.map((f) => (
                      <tr key={f.id as number}>
                        <td className="px-3 py-2 font-mono text-xs">{f.field_key as string}</td>
                        <td className="px-3 py-2">{f.field_label as string}</td>
                        <td className="px-3 py-2">{f.field_type as string}</td>
                        <td className="px-3 py-2">{f.is_required ? "yes" : "no"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-2 text-zinc-500" colSpan={4}>
                        No fields yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <form action={addFieldDefinitionAction} className="grid gap-3 sm:grid-cols-5">
              <input type="hidden" name="group_id" value={String(g.id)} />
              <input
                name="field_key"
                placeholder="field_key"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                name="field_label"
                placeholder="Field label"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <select
                name="field_type"
                defaultValue="text"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                <input name="is_required" type="checkbox" />
                Required
              </label>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Add Field
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}

