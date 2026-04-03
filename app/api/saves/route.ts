import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_saves")
    .select("id, note, created_at, businesses(id, name, address, google_rating, ai_summary)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saves: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { business_id?: string; note?: string };
  if (!body.business_id) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }
  const { error } = await supabase.from("user_saves").upsert(
    {
      user_id: user.id,
      business_id: body.business_id,
      note: body.note ?? null,
    },
    { onConflict: "user_id,business_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const svc = getServiceSupabase();
  void svc.from("interactions").insert({
    business_id: body.business_id,
    user_id: user.id,
    interaction_type: "save",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const businessId = url.searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "business_id query param required" }, { status: 400 });
  }
  const { error } = await supabase
    .from("user_saves")
    .delete()
    .eq("user_id", user.id)
    .eq("business_id", businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const svc = getServiceSupabase();
  void svc.from("interactions").insert({
    business_id: businessId,
    user_id: user.id,
    interaction_type: "unsave",
  });

  return NextResponse.json({ ok: true });
}
