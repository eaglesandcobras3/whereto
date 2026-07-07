import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { AskArtifact } from "@/lib/ask/types";

export type ArtifactShareRow = {
  slug: string;
  title: string;
  summary_text: string;
  artifact_snapshot: AskArtifact;
};

export async function loadArtifactShareBySlug(
  slug: string,
): Promise<ArtifactShareRow | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("artifact_shares")
    .select("slug, title, summary_text, artifact_snapshot")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;

  const snapshot = data.artifact_snapshot as AskArtifact;
  if (!snapshot || typeof snapshot !== "object" || !("type" in snapshot)) {
    return null;
  }

  return {
    slug: data.slug as string,
    title: data.title as string,
    summary_text: (data.summary_text as string) ?? "",
    artifact_snapshot: snapshot,
  };
}
