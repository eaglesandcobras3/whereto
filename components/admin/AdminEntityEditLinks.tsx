import Link from "next/link";
import { Suspense } from "react";
import {
  getAllFeatureFlags,
  isAdminBusinessDirectEditFeatureEnabled,
} from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";

type EntityKind = "business" | "guide" | "town" | "area";

type Props = {
  kind: EntityKind;
  entityId: string;
};

const EDIT_LABELS: Record<EntityKind, string> = {
  business: "Edit listing directly",
  guide: "Edit guide",
  town: "Edit town",
  area: "Edit area",
};

const EDIT_HREFS: Record<EntityKind, (id: string) => string> = {
  business: (id) => `/admin/businesses/${encodeURIComponent(id)}`,
  guide: (id) => `/admin/guides/${encodeURIComponent(id)}`,
  town: (id) => `/admin/towns/${encodeURIComponent(id)}`,
  area: (id) => `/admin/areas/${encodeURIComponent(id)}`,
};

async function AdminEntityEditLinksInner({ kind, entityId }: Props) {
  const admin = await requireAdminUser();
  if (!admin) return null;

  if (kind === "business" || kind === "town" || kind === "area") {
    const flags = await getAllFeatureFlags();
    if (!isAdminBusinessDirectEditFeatureEnabled(flags)) return null;
  }

  return (
    <aside
      className="fixed bottom-4 left-4 z-50 max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-lg"
      data-admin-only={`${kind}-direct-edit`}
    >
      <p className="font-semibold">Admin</p>
      <Link
        href={EDIT_HREFS[kind](entityId)}
        className="mt-1 inline-block font-medium underline hover:no-underline"
      >
        {EDIT_LABELS[kind]}
      </Link>
    </aside>
  );
}

/** Admin-only deep link to direct entity edit. Businesses/towns/areas gated by `admin_business_direct_edit`. */
export function AdminEntityEditLinks(props: Props) {
  return (
    <Suspense fallback={null}>
      <AdminEntityEditLinksInner {...props} />
    </Suspense>
  );
}
