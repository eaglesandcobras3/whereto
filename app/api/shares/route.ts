import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getServiceSupabase } from "@/lib/supabase/service-role";

/** Create a share link for a cached search result. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { cache_id?: string };
    if (!body.cache_id) {
      return NextResponse.json({ error: "cache_id required" }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data: row, error } = await supabase
      .from("query_cache")
      .select("id, response_json")
      .eq("id", body.cache_id)
      .maybeSingle();
    if (error || !row) {
      return NextResponse.json({ error: "Cache entry not found" }, { status: 404 });
    }
    const id = nanoid(12);
    const { error: insErr } = await supabase.from("shares").insert({
      id,
      cache_id: row.id,
      query_snapshot: row.response_json,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    return NextResponse.json({ share_id: id, url: `/share/${id}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
