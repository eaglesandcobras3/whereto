import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * Skip a needs_review item (leave the queue; no longer shown on apply/skip lists).
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
  if (item.status !== "needs_review" && item.status !== "pending") {
    return NextResponse.json(
      { error: `Item status is ${item.status}; only pending/needs_review can be skipped` },
      { status: 400 },
    );
  }

  const { error: updateErr } = await supabase
    .from("admin_business_seed_queue")
    .update({
      status: "skipped",
      result_reason: "Skipped by admin",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
