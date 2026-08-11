import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { RentalSearchPlan } from "@/lib/stays/search-params";
import type { RentalPropertyView } from "@/lib/stays/types";

export type RentalSearchResult = {
  items: RentalPropertyView[];
  total: number;
  page: number;
  pageSize: number;
};

export async function executeRentalSearch(plan: RentalSearchPlan): Promise<RentalSearchResult> {
  const supabase = getServiceSupabase();
  const from = (plan.page - 1) * plan.pageSize;
  const to = from + plan.pageSize - 1;

  let townId = plan.townId;
  if (!townId && plan.townSlug) {
    const { data: town } = await supabase
      .from("towns")
      .select("id")
      .eq("slug", plan.townSlug)
      .eq("status", "published")
      .maybeSingle();
    townId = (town as { id?: string } | null)?.id;
  }

  let areaId = plan.areaId;
  if (!areaId && plan.areaSlug) {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("slug", plan.areaSlug)
      .eq("status", "published")
      .maybeSingle();
    areaId = (area as { id?: string } | null)?.id;
  }

  let query = supabase
    .from("rental_properties_view")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .eq("partner_status", "active")
    .eq("is_hidden_from_search", false)
    .is("duplicate_of_property_id", null);

  if (townId) query = query.eq("town_id", townId);
  if (areaId) query = query.eq("area_id", areaId);
  if (plan.guests) query = query.gte("sleeps", plan.guests);
  if (plan.bedrooms != null) query = query.gte("bedrooms", plan.bedrooms);
  if (plan.bathrooms != null) query = query.gte("bathrooms", plan.bathrooms);
  if (plan.propertyType) query = query.eq("property_type", plan.propertyType);
  if (plan.pets) query = query.eq("pets_allowed", true);
  if (plan.pool) query = query.eq("private_pool", true);
  if (plan.gulfFront) query = query.eq("gulf_front", true);
  if (plan.gulfView) query = query.eq("gulf_view", true);
  if (plan.beachAccess) query = query.eq("beach_access", plan.beachAccess);
  if (plan.golfCart) query = query.eq("golf_cart_included", true);
  if (plan.q?.trim()) {
    const q = plan.q.trim().replace(/%/g, "");
    query = query.or(
      `title.ilike.%${q}%,description.ilike.%${q}%,local_context.ilike.%${q}%,search_terms.ilike.%${q}%`,
    );
  }

  query = query
    .order("featured", { ascending: false })
    .order("date_updated", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data ?? []) as unknown as RentalPropertyView[],
    total: count ?? 0,
    page: plan.page,
    pageSize: plan.pageSize,
  };
}

export async function getPublishedRentalBySlug(slug: string): Promise<RentalPropertyView | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("rental_properties_view")
    .select("*")
    .eq("slug", slug.trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as unknown as RentalPropertyView;
}

export async function listPublishedRentalsForBusiness(
  businessId: string,
  limit = 24,
): Promise<RentalPropertyView[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("rental_properties_view")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "published")
    .eq("partner_status", "active")
    .eq("is_hidden_from_search", false)
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RentalPropertyView[];
}

export async function listPublishedRentalsForTownSlug(
  townSlug: string,
  limit = 48,
): Promise<RentalPropertyView[]> {
  const supabase = getServiceSupabase();
  const { data: town } = await supabase
    .from("towns")
    .select("id, title, slug")
    .eq("slug", townSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!town) return [];

  const { data, error } = await supabase
    .from("rental_properties_view")
    .select("*")
    .eq("town_id", (town as { id: string }).id)
    .eq("status", "published")
    .eq("partner_status", "active")
    .eq("is_hidden_from_search", false)
    .order("featured", { ascending: false })
    .order("date_updated", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RentalPropertyView[];
}

export async function getActivePartnerForBusiness(
  businessId: string,
): Promise<{ id: string; status: string } | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("rental_partner_profiles")
    .select("id, status")
    .eq("business_id", businessId)
    .in("status", ["active", "import_pending", "approved", "paused"])
    .maybeSingle();
  return (data as { id: string; status: string } | null) ?? null;
}
