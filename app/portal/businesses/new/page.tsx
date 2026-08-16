import type { Metadata } from "next";
import { PortalNewBusinessForm } from "@/components/portal/PortalNewBusinessForm";
import { PortalShell } from "@/components/portal/PortalShell";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const metadata: Metadata = {
  title: "Add business",
  robots: { index: false, follow: false },
};

async function loadTowns(): Promise<ListBusinessTownOption[]> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("towns")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .order("title");
    return (data ?? []).map((t) => ({
      id: t.id as string,
      title: (t as { title: string }).title,
      slug: t.slug as string,
    }));
  } catch {
    return [];
  }
}

export default async function PortalNewBusinessPage() {
  const towns = await loadTowns();

  return (
    <PortalShell active="new">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Submit a new business for review. Nothing goes live until our team approves it.
      </p>
      {towns.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--color-text-secondary)]">
          Town directory is temporarily unavailable. Try again later.
        </p>
      ) : (
        <PortalNewBusinessForm towns={towns} />
      )}
    </PortalShell>
  );
}
