import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listTownPickerOptions } from "@/lib/admin/guides";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { setPartnerStatus } from "@/lib/stays/partner-application";
import {
  RENTAL_PARTNER_STATUSES,
  RENTAL_PROPERTY_STATUSES,
  RENTAL_PROPERTY_TYPES,
} from "@/lib/stays/types";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const optionalUrl = z
  .string()
  .optional()
  .nullable()
  .transform((s) => {
    const t = (s ?? "").trim();
    return t || null;
  })
  .refine((s) => s === null || z.string().url().safeParse(s).success, {
    message: "Enter a valid URL (https://…).",
  });

const optionalUuid = z
  .string()
  .optional()
  .nullable()
  .transform((s) => {
    const t = (s ?? "").trim();
    return t || null;
  })
  .refine((s) => s === null || z.string().uuid().safeParse(s).success, {
    message: "Invalid id",
  });

export async function GET(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kind = request.nextUrl.searchParams.get("kind") ?? "properties";
  const supabase = getServiceSupabase();

  if (kind === "partners") {
    const { data, error } = await supabase
      .from("rental_partner_profiles")
      .select(
        "id, business_id, display_name, show_public_business_profile, status, contact_name, contact_email, pms_name, import_method, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  if (kind === "options") {
    const towns = await listTownPickerOptions(supabase);
    return NextResponse.json({ towns });
  }

  if (kind === "jobs") {
    const { data, error } = await supabase
      .from("rental_import_jobs")
      .select("id, partner_id, method, status, stats, created_at, finished_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  const status = request.nextUrl.searchParams.get("status");
  let q = supabase
    .from("rental_properties")
    .select(
      "id, slug, title, status, business_id, partner_id, town_id, bedrooms, bathrooms, sleeps, booking_url, content_rights_confirmed, last_synced_at, last_sync_status, featured, date_updated",
    )
    .order("date_updated", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

const upsertSchema = z.object({
  entity: z.literal("property").optional(),
  id: z.string().uuid().optional(),
  business_id: optionalUuid,
  partner_id: z.string().uuid(),
  slug: z.string().trim().min(2).max(160),
  title: z.string().trim().min(2).max(200),
  description: z.string().max(20000).optional().nullable(),
  local_context: z.string().max(20000).optional().nullable(),
  property_type: z.enum(RENTAL_PROPERTY_TYPES).default("house"),
  status: z.enum(RENTAL_PROPERTY_STATUSES).default("draft"),
  town_id: optionalUuid,
  area_id: optionalUuid,
  bedrooms: z.coerce.number().min(0).max(30),
  bathrooms: z.coerce.number().min(0).max(30),
  sleeps: z.coerce.number().int().min(1).max(50),
  pets_allowed: z.boolean().optional().nullable(),
  private_pool: z.boolean().optional().nullable(),
  gulf_front: z.boolean().optional().nullable(),
  gulf_view: z.boolean().optional().nullable(),
  beach_access: z.enum(["none", "public", "private", "unknown"]).optional().nullable(),
  golf_cart_included: z.boolean().optional().nullable(),
  booking_url: optionalUrl,
  hero_image_url: optionalUrl,
  content_rights_confirmed: z.boolean().optional(),
  featured: z.boolean().optional(),
  pricing_reliable: z.boolean().optional(),
  starting_nightly_rate: z.coerce.number().optional().nullable(),
});

const createPartnerSchema = z.object({
  entity: z.literal("partner"),
  display_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  business_id: optionalUuid,
  show_public_business_profile: z.boolean().optional().default(false),
  status: z.enum(RENTAL_PARTNER_STATUSES).default("active"),
  booking_engine_base_url: optionalUrl,
  pms_name: z.string().trim().max(120).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  if ((json as { entity?: string }).entity === "partner") {
    const parsed = createPartnerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid partner" },
        { status: 400 },
      );
    }
    const now = new Date().toISOString();
    const showPublic =
      Boolean(parsed.data.business_id) && parsed.data.show_public_business_profile === true;
    const { data, error } = await supabase
      .from("rental_partner_profiles")
      .insert({
        display_name: parsed.data.display_name,
        contact_name: parsed.data.contact_name,
        contact_email: parsed.data.contact_email,
        contact_phone: parsed.data.contact_phone || null,
        business_id: parsed.data.business_id,
        show_public_business_profile: showPublic,
        status: parsed.data.status,
        booking_engine_base_url: parsed.data.booking_engine_base_url,
        pms_name: parsed.data.pms_name || null,
        import_method: "manual",
        updated_at: now,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id, entity: "partner" });
  }

  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }

  let businessId = parsed.data.business_id;
  if (businessId == null) {
    const { data: partner } = await supabase
      .from("rental_partner_profiles")
      .select("business_id")
      .eq("id", parsed.data.partner_id)
      .maybeSingle();
    businessId = (partner as { business_id?: string | null } | null)?.business_id ?? null;
  }

  const propertyFields = { ...parsed.data };
  delete (propertyFields as { entity?: string }).entity;
  const row = {
    ...propertyFields,
    business_id: businessId,
    date_updated: new Date().toISOString(),
    published_at:
      parsed.data.status === "published" ? new Date().toISOString() : undefined,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("rental_properties").update(row).eq("id", parsed.data.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: parsed.data.id, entity: "property" });
  }

  const { data, error } = await supabase.from("rental_properties").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, entity: "property" });
}

const partnerActionSchema = z.object({
  partner_id: z.string().uuid(),
  status: z.enum(RENTAL_PARTNER_STATUSES),
  admin_notes: z.string().max(2000).optional().nullable(),
  rejected_reason: z.string().max(2000).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = partnerActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid partner update" }, { status: 400 });
  }

  await setPartnerStatus({
    partnerId: parsed.data.partner_id,
    status: parsed.data.status,
    adminNotes: parsed.data.admin_notes,
    rejectedReason: parsed.data.rejected_reason,
    approvedBy: admin.userId,
  });

  return NextResponse.json({ ok: true });
}
