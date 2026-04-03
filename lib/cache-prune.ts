import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function pruneExpiredQueryCache() {
  const supabase = getServiceSupabase();
  const { error, count } = await supabase
    .from("query_cache")
    .delete({ count: "exact" })
    .lt("expires_at", new Date().toISOString());
  if (error) throw error;
  return { deleted: count ?? 0 };
}
