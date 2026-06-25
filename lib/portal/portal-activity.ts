import { getServiceSupabase } from "@/lib/supabase/service-role";

/** True once the user has claimed, submitted, or otherwise engaged with the business portal. */
export async function userHasPortalActivity(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase();

  const [{ count: membershipCount }, { count: reviewCount }, { count: listingRequestCount }] =
    await Promise.all([
      supabase
        .from("business_members")
        .select("business_id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("portal_review_items")
        .select("id", { count: "exact", head: true })
        .eq("submitted_by", userId),
      supabase
        .from("business_listing_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  return (
    (membershipCount ?? 0) > 0 ||
    (reviewCount ?? 0) > 0 ||
    (listingRequestCount ?? 0) > 0
  );
}
