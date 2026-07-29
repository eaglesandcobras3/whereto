import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CommunityTipEntityType,
  type OwnCommunityTip,
  type PublicCommunityTip,
} from "@/lib/community-tips/schema";
import { entityPublicPath } from "@/lib/community-tips/attribution";

type TipRow = {
  id: string;
  user_id?: string;
  entity_type: CommunityTipEntityType;
  entity_id: string;
  kind: "tip" | "review";
  body: string;
  rating: number | null;
  attribution_city: string | null;
  status: OwnCommunityTip["status"];
  created_at: string;
  updated_at: string;
  admin_notes?: string | null;
  reviewed_at?: string | null;
};

function toPublic(row: TipRow): PublicCommunityTip {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    rating: row.rating,
    attribution_city: row.attribution_city,
    created_at: row.created_at,
  };
}

export async function listPublishedTipsForEntity(
  supabase: SupabaseClient,
  entityType: CommunityTipEntityType,
  entityId: string,
  limit = 20,
): Promise<PublicCommunityTip[]> {
  const { data, error } = await supabase
    .from("community_tips")
    .select("id, kind, body, rating, attribution_city, created_at, entity_type, entity_id, status, updated_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listPublishedTipsForEntity", error);
    return [];
  }
  return (data as TipRow[] | null)?.map(toPublic) ?? [];
}

export async function listOwnTips(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnCommunityTip[]> {
  const { data, error } = await supabase
    .from("community_tips")
    .select(
      "id, entity_type, entity_id, kind, body, rating, attribution_city, status, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("listOwnTips", error);
    return [];
  }
  const rows = (data as TipRow[] | null) ?? [];
  const enriched = await enrichEntityMeta(supabase, rows);
  return enriched;
}

async function enrichEntityMeta(
  supabase: SupabaseClient,
  rows: TipRow[],
): Promise<OwnCommunityTip[]> {
  const byType = {
    business: new Set<string>(),
    town: new Set<string>(),
    area: new Set<string>(),
    guide: new Set<string>(),
  };
  for (const r of rows) byType[r.entity_type]?.add(r.entity_id);

  const titles = new Map<string, { title: string; slug: string | null }>();

  async function load(
    table: string,
    ids: string[],
    titleCol: "title" | "name",
    slugCol = "slug",
  ) {
    if (!ids.length) return;
    const select =
      titleCol === "name" ? "id, name, slug" : "id, title, slug";
    const { data } = await supabase.from(table).select(select).in("id", ids);
    for (const row of data ?? []) {
      const r = row as unknown as Record<string, unknown>;
      titles.set(String(r.id), {
        title: String(r[titleCol] ?? ""),
        slug: typeof r[slugCol] === "string" ? (r[slugCol] as string) : null,
      });
    }
  }

  await Promise.all([
    load("businesses", [...byType.business], "title"),
    load("towns", [...byType.town], "title"),
    load("areas", [...byType.area], "title"),
    load("guides", [...byType.guide], "title"),
  ]);

  // Areas may be POIs resolved under /area — try points_of_interest for missing area ids.
  const missingAreas = [...byType.area].filter((id) => !titles.has(id));
  if (missingAreas.length) {
    await load("points_of_interest", missingAreas, "title");
  }

  // Some town rows use `name` instead of title in older schemas — fallback query.
  const missingTowns = [...byType.town].filter((id) => !titles.has(id));
  if (missingTowns.length) {
    await load("towns", missingTowns, "name");
  }

  const missingBiz = [...byType.business].filter((id) => !titles.has(id));
  if (missingBiz.length) {
    await load("businesses", missingBiz, "name");
  }

  return rows.map((row) => {
    const meta = titles.get(row.entity_id);
    return {
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      kind: row.kind,
      body: row.body,
      rating: row.rating,
      attribution_city: row.attribution_city,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      entity_title: meta?.title || null,
      entity_href: entityPublicPath(row.entity_type, meta?.slug ?? null),
    };
  });
}

export async function entityExists(
  supabase: SupabaseClient,
  entityType: CommunityTipEntityType,
  entityId: string,
): Promise<boolean> {
  const table =
    entityType === "business"
      ? "businesses"
      : entityType === "town"
        ? "towns"
        : entityType === "guide"
          ? "guides"
          : "areas";

  const { data } = await supabase.from(table).select("id").eq("id", entityId).maybeSingle();
  if (data) return true;
  if (entityType === "area") {
    const { data: poi } = await supabase
      .from("points_of_interest")
      .select("id")
      .eq("id", entityId)
      .maybeSingle();
    return Boolean(poi);
  }
  return false;
}
