import { NextResponse } from "next/server";
import type { CsvRow } from "@/lib/directory-audit/csv";
import { processSeedBusiness } from "@/lib/directory-audit/process-seed-business";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const maxDuration = 60;

type QueueRow = {
  id: string;
  title: string;
  town: string;
  area: string;
  is_storefront: boolean;
  is_service_business: boolean;
  status: string;
  enriched: CsvRow | null;
};

async function loadItem(id: string) {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return { supabase: null, item: null, error: "Service unavailable" as const };

  const { data, error } = await supabase
    .from("admin_business_seed_queue")
    .select(
      "id, title, town, area, is_storefront, is_service_business, status, enriched",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { supabase, item: null, error: error.message };
  return { supabase, item: data as QueueRow | null, error: null };
}

async function persistResult(
  id: string,
  result: Awaited<ReturnType<typeof processSeedBusiness>>,
  status: "imported" | "force_imported" | "needs_review" | "skipped",
) {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return;
  await supabase
    .from("admin_business_seed_queue")
    .update({
      status,
      audit_status: result.auditStatus,
      audit_confidence: result.auditConfidence,
      audit_notes: result.auditNotes,
      enriched: result.enriched,
      business_id: result.businessId,
      business_slug: result.businessSlug,
      result_reason: result.reason,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/**
 * Apply Gemini verify + insert for one pending queue item.
 * Body: `{ id: string }`
 */
export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { id?: string };
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { supabase, item, error } = await loadItem(id);
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  if (error) return NextResponse.json({ error }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  if (item.status !== "pending" && item.status !== "processing") {
    return NextResponse.json(
      { error: `Item status is ${item.status}; only pending items can be applied` },
      { status: 400 },
    );
  }

  await supabase
    .from("admin_business_seed_queue")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", id);

  const result = await processSeedBusiness(
    supabase,
    {
      title: item.title,
      town: item.town,
      area: item.area,
      is_storefront: item.is_storefront,
      is_service_business: item.is_service_business,
    },
    { apply: true, force: false },
  );

  if (result.outcome === "imported" || result.outcome === "duplicate") {
    await persistResult(id, result, "imported");
    return NextResponse.json({
      ok: true,
      outcome: result.outcome,
      reason: result.reason,
      businessId: result.businessId,
      businessSlug: result.businessSlug,
      auditStatus: result.auditStatus,
    });
  }

  if (result.outcome === "needs_review" || result.outcome === "error") {
    await persistResult(id, result, "needs_review");
    return NextResponse.json({
      ok: true,
      outcome: "needs_review",
      reason: result.reason,
      auditStatus: result.auditStatus,
      auditNotes: result.auditNotes,
    });
  }

  await persistResult(id, result, "needs_review");
  return NextResponse.json({
    ok: true,
    outcome: result.outcome,
    reason: result.reason,
  });
}
