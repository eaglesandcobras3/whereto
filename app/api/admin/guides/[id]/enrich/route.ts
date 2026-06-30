import { NextResponse } from "next/server";
import { enrichGuideById } from "@/lib/guides/run-guide-enrichment";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const supabase = getServiceSupabase();
  const result = await enrichGuideById(supabase, id);

  if (!result.ok) {
    const status = result.error.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, enrichedAt: result.enrichedAt });
}
