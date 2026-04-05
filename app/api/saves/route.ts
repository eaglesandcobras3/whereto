import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_saves")
    .select(
      "id, note, created_at, collection_id, businesses(id, name, slug, address, ai_summary)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saves: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    business_id?: string;
    note?: string;
    collection_id?: number | null;
  };
  if (!body.business_id) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  if (body.collection_id != null) {
    const { data: col } = await supabase
      .from("user_collections")
      .select("id")
      .eq("id", body.collection_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!col) {
      return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
    }
  }

  const { error } = await supabase.from("user_saves").upsert(
    {
      user_id: user.id,
      business_id: body.business_id,
      note: body.note ?? null,
      collection_id: body.collection_id ?? null,
    },
    { onConflict: "user_id,business_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const svc = getServiceSupabase();
  void svc
    .from("businesses")
    .update({ refresh_priority: 1 })
    .eq("id", body.business_id);
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

/** Move a save into a collection (or uncategorized with null). */
export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    business_id?: string;
    collection_id?: number | null;
  };
  if (!body.business_id) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  if (body.collection_id != null) {
    const { data: col } = await supabase
      .from("user_collections")
      .select("id")
      .eq("id", body.collection_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!col) {
      return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("user_saves")
    .update({ collection_id: body.collection_id ?? null })
    .eq("user_id", user.id)
    .eq("business_id", body.business_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
