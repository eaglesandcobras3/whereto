import { NextResponse } from "next/server";
import { createAdminTown } from "@/lib/admin/admin-towns";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { title?: string; slug?: string };
  const title = (body.title ?? "").trim();
  if (title.length < 2) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    const town = await createAdminTown(supabase, { title, slug: body.slug });
    return NextResponse.json({ town });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
