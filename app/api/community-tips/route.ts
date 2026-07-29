import { NextRequest, NextResponse } from "next/server";
import { communityTipsApiBlocked } from "@/lib/feature-flags";
import { entityExists, listOwnTips, listPublishedTipsForEntity } from "@/lib/community-tips/queries";
import { isCommunityTipsUserRateLimited } from "@/lib/community-tips/rate-limit";
import {
  COMMUNITY_TIP_ENTITY_TYPES,
  communityTipUpdateSchema,
  communityTipUpsertSchema,
  type CommunityTipEntityType,
} from "@/lib/community-tips/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "1";
  const entityType = url.searchParams.get("entity_type");
  const entityId = url.searchParams.get("entity_id");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (mine) {
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tips = await listOwnTips(supabase, user.id);
    return NextResponse.json({ tips });
  }

  if (
    !entityType ||
    !COMMUNITY_TIP_ENTITY_TYPES.includes(entityType as CommunityTipEntityType) ||
    !entityId
  ) {
    return NextResponse.json(
      { error: "entity_type and entity_id are required" },
      { status: 400 },
    );
  }

  const svc = getServiceSupabase();
  const tips = await listPublishedTipsForEntity(
    svc,
    entityType as CommunityTipEntityType,
    entityId,
  );
  return NextResponse.json({ tips });
}

export async function POST(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = communityTipUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const svc = getServiceSupabase();

  if (!(await entityExists(svc, d.entity_type, d.entity_id))) {
    return NextResponse.json({ error: "That place was not found." }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("attribution_city")
    .eq("id", user.id)
    .maybeSingle();

  const cityFromProfile =
    typeof profile?.attribution_city === "string" ? profile.attribution_city.trim() : "";
  const cityFromBody = d.attribution_city?.trim() ?? "";
  const attributionCity = cityFromBody || cityFromProfile;

  if (!attributionCity) {
    return NextResponse.json(
      {
        error: "Add your city (where you’re from) on your account before leaving a tip.",
        code: "attribution_city_required",
      },
      { status: 400 },
    );
  }

  if (cityFromBody && cityFromBody !== cityFromProfile) {
    await supabase.from("profiles").upsert(
      { id: user.id, attribution_city: attributionCity },
      { onConflict: "id" },
    );
  }

  if (isCommunityTipsUserRateLimited(user.id)) {
    return NextResponse.json(
      { error: "You’ve hit today’s tip limit. Try again tomorrow." },
      { status: 429 },
    );
  }

  const rating = d.kind === "review" ? d.rating ?? null : null;

  const { data, error } = await supabase
    .from("community_tips")
    .upsert(
      {
        user_id: user.id,
        entity_type: d.entity_type,
        entity_id: d.entity_id,
        kind: d.kind,
        body: d.body,
        rating,
        attribution_city: attributionCity,
        status: "pending",
        updated_at: new Date().toISOString(),
        reviewed_by: null,
        reviewed_at: null,
        admin_notes: null,
      },
      { onConflict: "user_id,entity_type,entity_id" },
    )
    .select(
      "id, entity_type, entity_id, kind, body, rating, attribution_city, status, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("community_tips upsert", error);
    return NextResponse.json({ error: "Could not save your tip." }, { status: 500 });
  }

  return NextResponse.json({ tip: data, ok: true });
}

export async function PATCH(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = communityTipUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (isCommunityTipsUserRateLimited(user.id)) {
    return NextResponse.json(
      { error: "You’ve hit today’s tip limit. Try again tomorrow." },
      { status: 429 },
    );
  }

  const d = parsed.data;
  const { data: existing, error: loadErr } = await supabase
    .from("community_tips")
    .select("id, kind, rating, attribution_city")
    .eq("id", d.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadErr || !existing) {
    return NextResponse.json({ error: "Tip not found." }, { status: 404 });
  }

  const kind = d.kind ?? (existing.kind as "tip" | "review");
  let rating: number | null;
  if (kind === "tip") {
    rating = null;
  } else if (d.rating !== undefined) {
    rating = d.rating;
  } else {
    rating = existing.rating as number | null;
  }
  if (kind === "review" && (rating == null || rating < 1)) {
    return NextResponse.json({ error: "Reviews need a star rating (1–5)." }, { status: 400 });
  }

  let attributionCity =
    d.attribution_city !== undefined
      ? d.attribution_city
      : (existing.attribution_city as string | null);

  if (d.attribution_city) {
    await supabase.from("profiles").upsert(
      { id: user.id, attribution_city: d.attribution_city },
      { onConflict: "id" },
    );
    attributionCity = d.attribution_city;
  }

  if (!attributionCity?.trim()) {
    return NextResponse.json(
      { error: "City is required for tips.", code: "attribution_city_required" },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {
    status: "pending",
    updated_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    kind,
    rating,
    attribution_city: attributionCity.trim(),
  };
  if (d.body !== undefined) patch.body = d.body;

  const { data, error } = await supabase
    .from("community_tips")
    .update(patch)
    .eq("id", d.id)
    .eq("user_id", user.id)
    .select(
      "id, entity_type, entity_id, kind, body, rating, attribution_city, status, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("community_tips update", error);
    return NextResponse.json({ error: "Could not update your tip." }, { status: 500 });
  }

  return NextResponse.json({ tip: data, ok: true });
}

export async function DELETE(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("community_tips")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("community_tips delete", error);
    return NextResponse.json({ error: "Could not delete tip." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
