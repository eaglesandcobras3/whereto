import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      business_id?: string;
      interaction_type?: string;
      query_hash?: string;
      session_id?: string;
      metadata?: Record<string, unknown>;
    };
    if (!body.business_id || !body.interaction_type) {
      return NextResponse.json(
        { error: "business_id and interaction_type required" },
        { status: 400 },
      );
    }
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const supabase = getServiceSupabase();
    const { error } = await supabase.from("interactions").insert({
      business_id: body.business_id,
      user_id: user?.id ?? null,
      session_id: body.session_id ?? null,
      interaction_type: body.interaction_type,
      query_hash: body.query_hash ?? null,
      metadata: body.metadata ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.interaction_type === "click") {
      const { data: b } = await supabase
        .from("businesses")
        .select("total_clicks")
        .eq("id", body.business_id)
        .single();
      const n = (b?.total_clicks as number) ?? 0;
      await supabase
        .from("businesses")
        .update({ total_clicks: n + 1 })
        .eq("id", body.business_id);
    }
    if (body.interaction_type === "share") {
      const { data: b } = await supabase
        .from("businesses")
        .select("total_shares")
        .eq("id", body.business_id)
        .maybeSingle();
      if (b) {
        const n = (b.total_shares as number) ?? 0;
        await supabase
          .from("businesses")
          .update({ total_shares: n + 1 })
          .eq("id", body.business_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
