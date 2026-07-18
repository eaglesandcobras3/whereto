import { NextResponse } from "next/server";
import { isPageKind, scorePage } from "@/lib/irse";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind")?.trim() ?? "";
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  const inspect = url.searchParams.get("inspect") === "1";
  const forceInspect = url.searchParams.get("forceInspect") === "1";

  if (!isPageKind(kind)) {
    return NextResponse.json(
      { error: "Invalid kind. Use business|guide|town|area|category." },
      { status: 400 },
    );
  }
  if (!slug) {
    return NextResponse.json({ error: "slug is required." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const result = await scorePage(supabase, kind, slug, {
    inspect,
    forceInspect,
    persist: true,
  });

  if (!result) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
