import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED = new Set([
  "not_relevant",
  "had_bad_experience",
  "hide_for_me",
  "inaccurate_info",
]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      business_id?: string;
      feedback_type?: string;
      feedback_reason?: string | null;
      query_context?: string | null;
      session_id?: string | null;
      notes?: string | null;
    };
    if (!body.business_id || !body.feedback_type || !ALLOWED.has(body.feedback_type)) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    }
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const supabase = getServiceSupabase();

    const { error } = await supabase.from("user_feedback").insert({
      business_id: body.business_id,
      user_id: user?.id ?? null,
      session_id: body.session_id ?? null,
      feedback_type: body.feedback_type,
      feedback_reason: body.feedback_reason ?? null,
      query_context: body.query_context ?? null,
      notes: body.notes ?? null,
    });
    if (error?.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.feedback_type === "hide_for_me" || body.feedback_type === "had_bad_experience") {
      if (user?.id) {
        await supabase.from("user_suppressions").upsert(
          {
            user_id: user.id,
            business_id: body.business_id,
            suppression_type:
              body.feedback_type === "hide_for_me"
                ? "hide_for_me"
                : "had_bad_experience",
          },
          { onConflict: "user_id,business_id,suppression_type" },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
