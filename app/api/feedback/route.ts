import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseFeedbackBody,
  shouldUpsertSuppression,
} from "@/lib/feedback/validate";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = parseFeedbackBody(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const body = parsed.data;
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const supabase = getServiceSupabase();

    const { error } = await supabase.from("user_feedback").insert({
      business_id: body.business_id,
      user_id: user?.id ?? null,
      session_id: body.session_id,
      feedback_type: body.feedback_type,
      feedback_reason: body.feedback_reason,
      query_context: body.query_context,
      notes: body.notes,
    });
    if (error?.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (shouldUpsertSuppression(body.feedback_type, user?.id)) {
      await supabase.from("user_suppressions").upsert(
        {
          user_id: user!.id,
          business_id: body.business_id,
          suppression_type:
            body.feedback_type === "hide_for_me"
              ? "hide_for_me"
              : "had_bad_experience",
        },
        { onConflict: "user_id,business_id,suppression_type" },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
