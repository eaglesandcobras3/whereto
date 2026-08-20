import { NextResponse } from "next/server";
import type { CsvRow } from "@/lib/directory-audit/csv";
import { processSeedBusiness } from "@/lib/directory-audit/process-seed-business";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Force-import a needs_review item using stored enrichment (no new Gemini call).
 * Body: `{ id: string }`
 */
export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { id?: string };
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: item, error } = await supabase
    .from("admin_business_seed_queue")
    .select(
      "id, title, town, area, is_storefront, is_service_business, status, enriched",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  if (item.status !== "needs_review") {
    return NextResponse.json(
      { error: `Item status is ${item.status}; only needs_review items can be force-applied` },
      { status: 400 },
    );
  }

  const result = await processSeedBusiness(
    supabase,
    {
      title: item.title,
      town: item.town,
      area: item.area,
      is_storefront: Boolean(item.is_storefront),
      is_service_business: Boolean(item.is_service_business),
    },
    {
      apply: true,
      force: true,
      skipAudit: true,
      priorEnriched: (item.enriched as CsvRow | null) ?? null,
    },
  );

  if (result.outcome === "force_imported" || result.outcome === "imported" || result.outcome === "duplicate") {
    await supabase
      .from("admin_business_seed_queue")
      .update({
        status: result.outcome === "duplicate" ? "imported" : "force_imported",
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

    return NextResponse.json({
      ok: true,
      outcome: result.outcome,
      reason: result.reason,
      businessId: result.businessId,
      businessSlug: result.businessSlug,
    });
  }

  await supabase
    .from("admin_business_seed_queue")
    .update({
      result_reason: result.reason,
      audit_notes: result.auditNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json(
    { ok: false, outcome: result.outcome, error: result.reason },
    { status: 400 },
  );
}
