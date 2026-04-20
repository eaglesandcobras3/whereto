import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getContentEntryById } from "@/lib/data/content-entries";
import { ContentEntryForm } from "../content-entry-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditContentEntryPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const entry = await getContentEntryById(id);
  if (!entry) notFound();

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
    </div>
  );
}

