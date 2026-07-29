import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { communityTipsApiBlocked } from "@/lib/feature-flags";
import { entityPublicPath } from "@/lib/community-tips/attribution";
import { COMMUNITY_TIP_STATUSES } from "@/lib/community-tips/schema";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const adminActionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["publish", "reject", "hide", "delete"]),
  admin_notes: z.string().trim().max(2000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  if (!COMMUNITY_TIP_STATUSES.includes(status as (typeof COMMUNITY_TIP_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("community_tips")
    .select(
      "id, user_id, entity_type, entity_id, kind, body, rating, attribution_city, status, admin_notes, created_at, updated_at, reviewed_at",
    )
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(100);

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

  const parsed = adminActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { id, action, admin_notes } = parsed.data;
  const supabase = getServiceSupabase();

  if (action === "delete") {
    const { error } = await supabase.from("community_tips").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const status =
    action === "publish" ? "published" : action === "reject" ? "rejected" : "hidden";

  const { data, error } = await supabase
    .from("community_tips")
    .update({
      status,
      admin_notes: admin_notes?.trim() || null,
      reviewed_by: admin.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tip: data });
}
