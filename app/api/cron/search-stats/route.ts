import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const start = Date.now();
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.rpc("refresh_search_cluster_business_stats", {
      p_since: "30 days",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, duration_ms: Date.now() - start });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stats refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
