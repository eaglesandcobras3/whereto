import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      items?: Array<{ business_id: string; query_hash: string; rank_position: number }>;
      session_id?: string;
    };
    if (!body.items?.length) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const supabase = getServiceSupabase();

    const rows = body.items.map((i) => ({
      business_id: i.business_id,
      user_id: user?.id ?? null,
      session_id: body.session_id ?? null,
      query_hash: i.query_hash,
      rank_position: i.rank_position,
    }));

    const { error } = await supabase.from("impressions").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const seen = new Set<string>();
    for (const i of body.items) {
      if (seen.has(i.business_id)) continue;
      seen.add(i.business_id);
      const { data: b } = await supabase
        .from("businesses")
        .select("total_impressions")
        .eq("id", i.business_id)
        .maybeSingle();
      if (b) {
        const n = (b.total_impressions as number) ?? 0;
        await supabase
          .from("businesses")
          .update({ total_impressions: n + 1 })
          .eq("id", i.business_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
