import { requireAdmin } from "@/lib/admin/require-admin";
import { ContentEntryForm } from "../content-entry-form";

export default async function NewContentEntryPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">New Content Entry</h1>
        <p className="mt-1 text-sm text-zinc-600">Create a CMS entry for guide, town, page, or event content.</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ContentEntryForm />
      </div>
    </div>
  );
}

