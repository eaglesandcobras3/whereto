import { requireAdmin } from "@/lib/admin/require-admin";
import { MediaUploadForm } from "./upload-form";

export default async function AdminMediaPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Media</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Upload images and automatically generate compressed responsive variants.
        </p>
      </div>
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <MediaUploadForm />
      </section>
    </div>
  );
}

