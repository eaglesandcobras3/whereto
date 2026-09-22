import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { searchAreasForAdmin } from "@/lib/admin/admin-areas";
import { searchTownsForAdmin } from "@/lib/admin/admin-towns";
import { listAdminGuides } from "@/lib/admin/guides";
import { searchBusinessesForAdminEdit } from "@/lib/admin/search-businesses-for-edit";
import type { CommunityTipEntityType } from "@/lib/community-tips/schema";

export type CommunityTipEntityHit = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
};

export async function searchCommunityTipEntities(
  supabase: SupabaseClient,
  entityType: CommunityTipEntityType,
  query: string,
  limit = 12,
): Promise<CommunityTipEntityHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (entityType === "business") {
    const hits = await searchBusinessesForAdminEdit(supabase, q, limit);
    return hits.map((h) => ({
      id: h.id,
      title: h.title,
      slug: h.slug,
      subtitle: h.town_title,
    }));
  }

  if (entityType === "town") {
    const hits = await searchTownsForAdmin(supabase, q, limit);
    return hits.map((h) => ({
      id: h.id,
      title: h.title,
      slug: h.slug,
      subtitle: h.status,
    }));
  }

  if (entityType === "area") {
    const hits = await searchAreasForAdmin(supabase, q, limit);
    return hits.map((h) => ({
      id: h.id,
      title: h.title,
      slug: h.slug,
      subtitle: h.town_title,
    }));
  }

  const guides = await listAdminGuides(supabase, { q, limit: 40 });
  return guides.slice(0, limit).map((g) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    subtitle: g.town_name,
  }));
}
