import { NextRequest, NextResponse } from "next/server";
import {
  adminTagCreateSchema,
  adminTagPatchSchema,
  createAdminTag,
  listAdminTags,
  updateAdminTag,
} from "@/lib/admin/admin-tags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const supabase = getServiceSupabase();
  try {
    const tags = await listAdminTags(supabase, q || undefined);
    return NextResponse.json({ tags });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load tags";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = adminTagCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    const tag = await createAdminTag(supabase, parsed.data);
    return NextResponse.json({ tag });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { tag?: string; description?: string };
  const tag = (body.tag ?? "").trim();
  if (!tag) return NextResponse.json({ error: "tag is required" }, { status: 400 });

  const parsed = adminTagPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    const updated = await updateAdminTag(supabase, tag, parsed.data);
    return NextResponse.json({ tag: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
