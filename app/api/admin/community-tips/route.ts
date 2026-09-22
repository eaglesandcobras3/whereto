import { NextRequest, NextResponse } from "next/server";
import { communityTipsApiBlocked } from "@/lib/feature-flags";
import { entityPublicPath } from "@/lib/community-tips/attribution";
import { entityExists } from "@/lib/community-tips/queries";
import {
  DEFAULT_PLANT_WINDOW_DAYS,
  resolvePlantedCreatedAt,
} from "@/lib/community-tips/schedule";
import {
  COMMUNITY_TIP_ADMIN_LIST_STATUSES,
  communityTipAdminActionSchema,
  communityTipPlantSchema,
  type CommunityTipAdminListStatus,
} from "@/lib/community-tips/schema";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const ADMIN_TIP_SELECT =
  "id, user_id, entity_type, entity_id, body, rating, attribution_city, status, admin_notes, created_at, updated_at, reviewed_at, is_planted";

export async function GET(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = (new URL(request.url).searchParams.get("status") ??
    "pending") as CommunityTipAdminListStatus;
  if (!COMMUNITY_TIP_ADMIN_LIST_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const nowIso = new Date().toISOString();

  function listQuery(select: string) {
    const query = supabase.from("community_tips").select(select).limit(100);
    if (status === "scheduled") {
      return query.eq("status", "published").gt("created_at", nowIso).order("created_at", {
        ascending: true,
      });
    }
    if (status === "published") {
      return query.eq("status", "published").lte("created_at", nowIso).order("created_at", {
        ascending: false,
      });
    }
    return query.eq("status", status).order("created_at", { ascending: true });
  }

  let { data, error } = await listQuery(ADMIN_TIP_SELECT);
  if (error) {
    const retry = await listQuery(
      "id, user_id, entity_type, entity_id, body, rating, attribution_city, status, admin_notes, created_at, updated_at, reviewed_at",
    );
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const byType: Record<string, Set<string>> = {
    business: new Set(),
    town: new Set(),
    area: new Set(),
    guide: new Set(),
  };
  for (const r of rows) {
    byType[r.entity_type as string]?.add(r.entity_id as string);
  }

  const meta = new Map<string, { title: string; slug: string | null }>();

  async function load(table: string, ids: string[], titleCol: "title" | "name") {
    if (!ids.length) return;
    const select = titleCol === "name" ? "id, name, slug" : "id, title, slug";
    const { data: found } = await supabase.from(table).select(select).in("id", ids);
    for (const row of found ?? []) {
      const rec = row as unknown as Record<string, unknown>;
      meta.set(String(rec.id), {
        title: String(rec[titleCol] ?? ""),
        slug: typeof rec.slug === "string" ? rec.slug : null,
      });
    }
  }

  await Promise.all([
    load("businesses", [...byType.business], "title"),
    load("towns", [...byType.town], "title"),
    load("areas", [...byType.area], "title"),
    load("guides", [...byType.guide], "title"),
  ]);

  const missingBiz = [...byType.business].filter((id) => !meta.has(id));
  if (missingBiz.length) await load("businesses", missingBiz, "name");
  const missingTown = [...byType.town].filter((id) => !meta.has(id));
  if (missingTown.length) await load("towns", missingTown, "name");
  const missingArea = [...byType.area].filter((id) => !meta.has(id));
  if (missingArea.length) {
    await load("points_of_interest", missingArea, "title");
  }

  const items = rows.map((r) => {
    const m = meta.get(r.entity_id as string);
    return {
      ...r,
      entity_title: m?.title ?? null,
      entity_href: entityPublicPath(
        r.entity_type as "business" | "town" | "area" | "guide",
        m?.slug ?? null,
      ),
    };
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (isPlantPayload(json)) {
    return plantTip(json, admin.userId);
  }

  const parsed = communityTipAdminActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { id, action, admin_notes, schedule, window_days } = parsed.data;
  const supabase = getServiceSupabase();

  if (action === "delete") {
    const { error } = await supabase.from("community_tips").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  const status =
    action === "publish" ? "published" : action === "reject" ? "rejected" : "hidden";

  const patch: Record<string, unknown> = {
    status,
    admin_notes: admin_notes?.trim() || null,
    reviewed_by: admin.userId,
    reviewed_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  if (action === "publish" && schedule === "random_future") {
    patch.created_at = resolvePlantedCreatedAt({
      schedule: "random_future",
      windowDays: window_days ?? DEFAULT_PLANT_WINDOW_DAYS,
      now,
    }).toISOString();
  }

  const { data, error } = await supabase
    .from("community_tips")
    .update(patch)
    .eq("id", id)
    .select("id, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tip: data });
}

function isPlantPayload(json: unknown): json is { action: "plant" } {
  return Boolean(json && typeof json === "object" && (json as { action?: unknown }).action === "plant");
}

async function plantTip(json: unknown, adminUserId: string) {
  const parsed = communityTipPlantSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const city = d.attribution_city?.trim() ?? "";
  if (!city) {
    return NextResponse.json({ error: "City is required for planted tips." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!(await entityExists(supabase, d.entity_type, d.entity_id))) {
    return NextResponse.json({ error: "That place was not found." }, { status: 404 });
  }

  const now = new Date();
  const schedule = d.schedule ?? "random_future";
  const createdAt = resolvePlantedCreatedAt({
    schedule,
    windowDays: d.window_days ?? DEFAULT_PLANT_WINDOW_DAYS,
    now,
  });

  const { data, error } = await supabase
    .from("community_tips")
    .insert({
      user_id: adminUserId,
      entity_type: d.entity_type,
      entity_id: d.entity_id,
      body: d.body,
      rating: d.rating ?? null,
      attribution_city: city,
      status: "published",
      is_planted: true,
      reviewed_by: adminUserId,
      reviewed_at: now.toISOString(),
      created_at: createdAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .select(ADMIN_TIP_SELECT)
    .single();

  if (error) {
    console.error("community_tips plant", error);
    return NextResponse.json({ error: "Could not plant tip." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tip: data });
}
