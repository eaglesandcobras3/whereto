import { NextResponse } from "next/server";
import { createGuideTag, listGuideTagVocabulary } from "@/lib/admin/guides";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const tags = await listGuideTagVocabulary(supabase);
  return NextResponse.json({ tags });
}

export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { tag?: string };
  try {
    body = (await req.json()) as { tag?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.tag?.trim() ?? "";
  if (!raw) {
    return NextResponse.json({ error: "Tag is required." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    const tag = await createGuideTag(supabase, raw);
    const tags = await listGuideTagVocabulary(supabase);
    return NextResponse.json({ ok: true, tag, tags });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create tag";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
