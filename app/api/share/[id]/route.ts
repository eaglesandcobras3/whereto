import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("shares")
    .select("query_snapshot")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { error: "Not found" },
      {
        status: 404,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      },
    );
  }
  return NextResponse.json(data.query_snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
