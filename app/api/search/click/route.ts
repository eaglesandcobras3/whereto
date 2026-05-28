import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { searchLearningEnabled } from "@/lib/search/learning-boost";

export async function POST(request: NextRequest) {
  if (!searchLearningEnabled()) {
    return NextResponse.json({ ok: true });
  }
  try {
    const body = (await request.json()) as {
      impression_id?: string;
      business_id?: string;
      rank?: number;
      session_id?: string | null;
    };

    if (!body.impression_id || !body.business_id) {
      return NextResponse.json({ error: "impression_id and business_id required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from("search_clicks").insert({
      impression_id: body.impression_id,
      business_id: body.business_id,
      rank: typeof body.rank === "number" ? body.rank : 1,
      session_id: body.session_id ?? null,
      user_id: null,
    });

    if (error) {
      console.error("search click insert:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
