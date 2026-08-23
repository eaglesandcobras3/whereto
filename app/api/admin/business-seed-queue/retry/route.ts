import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * Move a needs_review item back to the pending queue for another apply attempt.
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
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  if (item.status !== "needs_review") {
    return NextResponse.json(
      { error: `Item status is ${item.status}; only needs_review items can be retried` },
      { status: 400 },
    );
  }

  const { error: updateErr } = await supabase
    .from("admin_business_seed_queue")
    .update({
      status: "pending",
      audit_status: null,
      audit_confidence: null,
      audit_notes: null,
      enriched: null,
      result_reason: null,
      processed_at: null,
      business_id: null,
      business_slug: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
