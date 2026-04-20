import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getContentEntryById } from "@/lib/data/content-entries";
import { ContentEntryForm } from "../content-entry-form";
import { updateContentFromMarkdownAction } from "../actions";
import { ContentMarkdownEditor } from "../content-markdown-editor";

type Props = {
  params: Promise<{ id: string }>;
};

function yamlScalar(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const text = String(value ?? "");
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function toYamlLines(key: string, value: unknown, indent = 0): string[] {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${pad}${key}: []`];
    const lines = [`${pad}${key}:`];
    for (const item of value) {
      if (item != null && typeof item === "object" && !Array.isArray(item)) {
        lines.push(`${pad}  -`);
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          lines.push(...toYamlLines(k, v, indent + 6));
        }
      } else {
        lines.push(`${pad}  - ${yamlScalar(item)}`);
      }
    }
    return lines;
  }
  if (value != null && typeof value === "object") {
    const lines = [`${pad}${key}:`];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      lines.push(...toYamlLines(k, v, indent + 2));
    }
    return lines;
  }
  return [`${pad}${key}: ${yamlScalar(value)}`];
}

function buildMarkdownTemplate(entry: Awaited<ReturnType<typeof getContentEntryById>>) {
  if (!entry) return "";
  const custom = (entry.custom_fields_json ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = {
    ...custom,
    title: entry.title,
    type: entry.content_type,
    slug: entry.slug,
    status: entry.status,
    seo_title: entry.seo_title ?? "",
    seo_description: entry.seo_description ?? "",
    seo_keywords: entry.seo_keywords ?? [],
  };

  const orderedKeys = [
    "title",
    "type",
    "slug",
    "status",
    "seo_title",
    "seo_description",
    "seo_keywords",
  ];
  const extraKeys = Object.keys(merged).filter((k) => !orderedKeys.includes(k));
  const allKeys = [...orderedKeys, ...extraKeys];

  const frontmatterLines = ["---"];
  for (const key of allKeys) {
    const value = merged[key];
    if (value === undefined) continue;
    frontmatterLines.push(...toYamlLines(key, value));
  }
  frontmatterLines.push("---", "");
  if (entry.body_markdown?.trim()) {
    frontmatterLines.push(entry.body_markdown.trim());
  }
  return frontmatterLines.join("\n");
}

export default async function EditContentEntryPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const entry = await getContentEntryById(id);
  if (!entry) notFound();
  const markdownTemplate = buildMarkdownTemplate(entry);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Content Entry</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {entry.content_type} / {entry.slug}
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ContentEntryForm entry={entry} />
      </div>
      <ContentMarkdownEditor
        initialMarkdown={markdownTemplate}
        action={updateContentFromMarkdownAction.bind(null, id)}
      />
    </div>
  );
}

