import { NextResponse } from "next/server";
import {
  getAdminGuideById,
  updateAdminGuide,
  type GuideWriteInput,
} from "@/lib/admin/guides";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const supabase = getServiceSupabase();
  const guide = await getAdminGuideById(supabase, id);
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ guide });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  let body: GuideWriteInput;
  try {
    body = (await req.json()) as GuideWriteInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    const updated = await updateAdminGuide(supabase, id, body);
    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    const status = msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
