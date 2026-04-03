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
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
