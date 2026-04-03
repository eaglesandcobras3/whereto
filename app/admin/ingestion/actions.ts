"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { expandDiscoveryQueries } from "@/lib/ingestion/query-expansion";
import { runDiscoveryJobById } from "@/lib/ingestion/discovery-runner";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function createDiscoveryJobAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const category_id = Number(formData.get("category_id"));
  const town_id = Number(formData.get("town_id"));
  const query_string = String(formData.get("query_string") ?? "").trim();
  const run_now = formData.get("run_now") === "on";
  const expand_variants = formData.get("expand_variants") === "on";

  if (!Number.isFinite(category_id) || !Number.isFinite(town_id)) {
    return;
  }

  const supabase = getServiceSupabase();

  const [{ data: cat }, { data: tw }] = await Promise.all([
    supabase.from("categories").select("name").eq("id", category_id).single(),
    supabase.from("towns").select("name").eq("id", town_id).single(),
  ]);

  const queries: string[] = [];
  if (expand_variants && cat?.name && tw?.name) {
    queries.push(...expandDiscoveryQueries({ categoryName: cat.name as string, townName: tw.name as string }));
  }
  if (query_string) {
    queries.unshift(query_string);
  }
  const unique = [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
  if (!unique.length) return;

  let firstJobId: number | undefined;
  for (let i = 0; i < unique.length; i++) {
    const qs = unique[i]!;
    const { data: inserted, error } = await supabase
      .from("search_jobs")
      .insert({
        job_type: "discovery",
        category_id,
        town_id,
        query_string: qs,
        status: "pending",
        priority: i === 0 ? 1 : 2,
        next_run_after: new Date().toISOString(),
        max_runs: 5,
        run_count: 0,
      })
      .select("id")
      .single();

    if (error) continue;
    if (firstJobId == null) firstJobId = inserted?.id as number;
  }

  if (run_now && firstJobId != null) {
    await runDiscoveryJobById(firstJobId);
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/admin/ingestion");
}
