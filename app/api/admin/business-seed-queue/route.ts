import { NextResponse } from "next/server";
import { listRecentBusinessesForAdmin } from "@/lib/admin/list-recent-businesses";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { validateSeedBusinessInput } from "@/lib/directory-audit/process-seed-business";

export const runtime = "nodejs";

export type SeedQueueItem = {
  id: string;
  title: string;
  town: string;
  area: string;
  town_id: string | null;
  area_id: string | null;
  is_storefront: boolean;
  is_service_business: boolean;
  status: string;
  audit_status: string | null;
  audit_confidence: string | null;
  audit_notes: string | null;
  enriched: Record<string, unknown> | null;
  business_id: string | null;
  business_slug: string | null;
  result_reason: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
};

/** List pending + needs_review queue items; also returns town/area options for the form. */
export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const [{ data: queue, error: queueErr }, { data: towns, error: townsErr }, { data: areas, error: areasErr }] =
    await Promise.all([
      supabase
        .from("admin_business_seed_queue")
        .select(
          "id, title, town, area, town_id, area_id, is_storefront, is_service_business, status, audit_status, audit_confidence, audit_notes, enriched, business_id, business_slug, result_reason, created_at, updated_at, processed_at",
        )
        .in("status", ["pending", "needs_review", "processing"])
        .order("created_at", { ascending: true }),
      supabase.from("towns").select("id, title, slug").order("title"),
      supabase.from("areas").select("id, title, slug, town_id").order("title"),
    ]);

  if (queueErr) {
    return NextResponse.json(
      {
        error:
          queueErr.message.includes("admin_business_seed_queue")
            ? "Queue table missing — apply scripts/migrations/admin-business-seed-queue.sql"
            : queueErr.message,
      },
      { status: 500 },
    );
  }
  if (townsErr) return NextResponse.json({ error: townsErr.message }, { status: 500 });
  if (areasErr) return NextResponse.json({ error: areasErr.message }, { status: 500 });

  const items = (queue ?? []) as SeedQueueItem[];

  let recentBusinesses: Awaited<ReturnType<typeof listRecentBusinessesForAdmin>> = [];
  try {
    recentBusinesses = await listRecentBusinessesForAdmin(supabase, { days: 30 });
  } catch (e) {
    console.error("recent businesses", e);
  }

  return NextResponse.json({
    pending: items.filter((item) => item.status === "pending" || item.status === "processing"),
    needsReview: items.filter((item) => item.status === "needs_review"),
    recentBusinesses,
    options: {
      towns: towns ?? [],
      areas: areas ?? [],
    },
  });
}

/** Enqueue a new seed business. */
export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const body = (await req.json()) as {
    title?: string;
    town?: string;
    area?: string;
    town_id?: string | null;
    area_id?: string | null;
    is_storefront?: boolean;
    is_service_business?: boolean;
  };

  const title = (body.title ?? "").trim();
  const town = (body.town ?? "").trim();
  const area = (body.area ?? "").trim();
  const is_storefront = Boolean(body.is_storefront);
  const is_service_business = Boolean(body.is_service_business);

  const validationError = validateSeedBusinessInput({
    title,
    town,
    area,
    is_storefront,
    is_service_business,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("admin_business_seed_queue")
    .insert({
      title,
      town,
      area,
      town_id: body.town_id || null,
      area_id: body.area_id || null,
      is_storefront,
      is_service_business,
      status: "pending",
      created_by: admin.userId,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, title, town, area, town_id, area_id, is_storefront, is_service_business, status, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("admin_business_seed_queue")
            ? "Queue table missing — apply scripts/migrations/admin-business-seed-queue.sql"
            : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ item: data });
}
