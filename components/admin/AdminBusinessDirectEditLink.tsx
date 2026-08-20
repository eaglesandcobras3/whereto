import Link from "next/link";
import { Suspense } from "react";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

type Props = {
  businessId: string;
};

async function AdminBusinessDirectEditLinkInner({ businessId }: Props) {
  const admin = await requireAdminUser();
  if (!admin) return null;

  const flags = await getAllFeatureFlags();
  if (!isAdminBusinessDirectEditFeatureEnabled(flags)) return null;

  return (
    <aside
      className="fixed bottom-4 left-4 z-50 max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-lg"
      data-admin-only="business-direct-edit"
    >
      <p className="font-semibold">Admin</p>
      <Link
        href={`/admin/businesses/${encodeURIComponent(businessId)}`}
        className="mt-1 inline-block font-medium underline hover:no-underline"
      >
        Edit listing directly
      </Link>
    </aside>
  );
}

/** Admin-only link to direct business edit (gated by `admin_business_direct_edit`). */
export function AdminBusinessDirectEditLink(props: Props) {
  return (
    <Suspense fallback={null}>
      <AdminBusinessDirectEditLinkInner {...props} />
    </Suspense>
  );
}
