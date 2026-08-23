import { NextResponse } from "next/server";
import { createAdminArea } from "@/lib/admin/admin-areas";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { title?: string; slug?: string; town_id?: string | null };
  const title = (body.title ?? "").trim();
  if (title.length < 2) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    const area = await createAdminArea(supabase, {
      title,
      slug: body.slug,
      town_id: body.town_id ?? null,
    });
    return NextResponse.json({ area });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
