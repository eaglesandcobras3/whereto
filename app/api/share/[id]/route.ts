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
    .select("query_snapshot, access_count")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  void supabase
    .from("shares")
    .update({ access_count: (data.access_count as number) + 1 })
    .eq("id", id);
  return NextResponse.json(data.query_snapshot);
}
