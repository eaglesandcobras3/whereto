import { NextResponse } from "next/server";
import { listAdminGuides, createAdminGuide, type GuideWriteInput } from "@/lib/admin/guides";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  const supabase = getServiceSupabase();
  const guides = await listAdminGuides(supabase, { status: status || undefined });
  return NextResponse.json({ guides });
}

export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    const created = await createAdminGuide(supabase, body);
    return NextResponse.json({ ok: true, ...created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
