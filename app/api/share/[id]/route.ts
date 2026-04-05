import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("shares")
    .select("query_snapshot, access_count")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let lastReferrerHost: string | null = null;
  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    try {
      const h = new URL(refererHeader).hostname;
      lastReferrerHost = h.length > 200 ? h.slice(0, 200) : h;
    } catch {
      lastReferrerHost = null;
    }
  }

  const nextCount = (data.access_count as number) + 1;
  const patch: { access_count: number; last_referrer_host?: string } = {
    access_count: nextCount,
  };
  if (lastReferrerHost) patch.last_referrer_host = lastReferrerHost;

  void supabase.from("shares").update(patch).eq("id", id);
  return NextResponse.json(data.query_snapshot);
}
