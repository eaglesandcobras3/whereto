import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

type Snapshot = {
  query?: string;
  summary?: string;
};

/** For Open Graph only — no logging of snapshot body. */
export async function getShareSnapshotMeta(shareId: string): Promise<{
  title: string;
  description: string;
} | null> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return null;
  const { data } = await supabase
    .from("shares")
    .select("query_snapshot")
    .eq("id", shareId)
    .maybeSingle();
  if (!data?.query_snapshot) return null;
  const snap = data.query_snapshot as Snapshot;
  const summary = (snap.summary ?? "Shared WhereTo30A results").trim();
  const title =
    summary.length > 58 ? `${summary.slice(0, 55)}... | WhereTo30A` : `${summary} | WhereTo30A`;
  const description =
    summary.length > 155 ? `${summary.slice(0, 152)}…` : summary;
  return { title, description };
}
