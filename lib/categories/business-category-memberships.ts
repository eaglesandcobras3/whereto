import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  assertLeafCategoryIds,
  normalizeMembershipIds,
  type ReplaceMembershipsInput,
} from "@/lib/categories/membership-normalize";

export {
  BUSINESS_CATEGORY_MEMBERSHIP_MAX,
  normalizeMembershipIds,
  assertLeafCategoryIds,
} from "@/lib/categories/membership-normalize";

type SupabaseLike = ReturnType<typeof getServiceSupabase>;

async function loadLeafIdSet(supabase: SupabaseLike): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("business_categories")
    .select("id, parent_category_id")
    .not("parent_category_id", "is", null);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => String(r.id)));
}

export async function listMembershipCategoryIds(
  businessId: string,
  supabase: SupabaseLike = getServiceSupabase(),
): Promise<string[]> {
  const { data, error } = await supabase
    .from("business_category_memberships")
    .select("category_id")
    .eq("business_id", businessId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.category_id));
}

/**
 * Replace all memberships for a business. Syncs with primary:
 * - Clears memberships when primary is null
 * - Ensures primary ∈ categoryIds
 */
export async function replaceMemberships(
  businessId: string,
  input: ReplaceMembershipsInput,
  supabase: SupabaseLike = getServiceSupabase(),
): Promise<{ primaryId: string | null; categoryIds: string[] }> {
  const normalized = normalizeMembershipIds(input);

  if (normalized.categoryIds.length === 0) {
    const { error: delErr } = await supabase
      .from("business_category_memberships")
      .delete()
      .eq("business_id", businessId);
    if (delErr) throw new Error(delErr.message);
    return normalized;
  }

  const leafIds = await loadLeafIdSet(supabase);
  assertLeafCategoryIds(normalized.categoryIds, leafIds);

  const { error: delErr } = await supabase
    .from("business_category_memberships")
    .delete()
    .eq("business_id", businessId);
  if (delErr) throw new Error(delErr.message);

  const rows = normalized.categoryIds.map((category_id) => ({
    business_id: businessId,
    category_id,
  }));
  const { error: insErr } = await supabase.from("business_category_memberships").insert(rows);
  if (insErr) throw new Error(insErr.message);

  return normalized;
}

/** After setting primary only (flag off / seed import): membership = [primary]. */
export async function syncMembershipsToPrimary(
  businessId: string,
  primaryCategoryId: string | null,
  supabase: SupabaseLike = getServiceSupabase(),
): Promise<void> {
  await replaceMemberships(
    businessId,
    {
      primaryId: primaryCategoryId,
      categoryIds: primaryCategoryId ? [primaryCategoryId] : [],
    },
    supabase,
  );
}

export async function businessIdsForCategoryPrimary(
  categoryId: string,
  supabase: SupabaseLike = getServiceSupabase(),
): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("primary_category_id", categoryId)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const row of batch) ids.push(String(row.id));
    if (batch.length < 1000) break;
    from += 1000;
  }
  return ids;
}

export async function businessIdsForCategoryMembership(
  categoryId: string,
  supabase: SupabaseLike = getServiceSupabase(),
): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("business_category_memberships")
      .select("business_id")
      .eq("category_id", categoryId)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const row of batch) ids.push(String(row.business_id));
    if (batch.length < 1000) break;
    from += 1000;
  }
  return ids;
}

export async function businessIdsForCategory(
  categoryId: string,
  opts: { useMemberships: boolean },
  supabase: SupabaseLike = getServiceSupabase(),
): Promise<string[]> {
  if (opts.useMemberships) {
    return businessIdsForCategoryMembership(categoryId, supabase);
  }
  return businessIdsForCategoryPrimary(categoryId, supabase);
}
