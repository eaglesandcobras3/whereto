import { getServiceSupabase } from "@/lib/supabase/service-role";

export type PortalAccountSummary = {
  businessCount: number;
  pendingCount: number;
  businesses: Array<{ id: string; title: string; slug: string }>;
};

export async function loadPortalAccountSummary(userId: string): Promise<PortalAccountSummary> {
  const supabase = getServiceSupabase();

  const [{ data: memberships }, { data: pending }] = await Promise.all([
    supabase
      .from("business_members")
      .select("business_id, businesses ( id, title, slug )")
      .eq("user_id", userId),
    supabase
      .from("portal_review_items")
      .select("id")
      .eq("submitted_by", userId)
      .eq("status", "pending"),
  ]);

  const businesses = (memberships ?? [])
    .map((row) => {
      const bizRaw = (row as { businesses: unknown }).businesses;
      const biz = (Array.isArray(bizRaw) ? bizRaw[0] : bizRaw) as {
        id?: string;
        title?: string;
        slug?: string;
      } | null;
      if (!biz?.id || !biz.title || !biz.slug) return null;
      return { id: biz.id, title: biz.title, slug: biz.slug };
    })
    .filter((b): b is { id: string; title: string; slug: string } => b !== null);

  return {
    businessCount: businesses.length,
    pendingCount: pending?.length ?? 0,
    businesses,
  };
}
