import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  parseCsv,
  rentalFingerprint,
  slugifyRentalTitle,
  validateCsvRows,
  type RentalCsvRow,
} from "@/lib/stays/csv";
import type { RentalPropertyType } from "@/lib/stays/types";

export type ImportCsvResult = {
  jobId: string;
  status: "succeeded" | "failed" | "partial";
  rowsOk: number;
  rowsFailed: number;
  errors: Array<{ row: number; errors: string[] }>;
};

async function resolveTownId(slug: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("towns")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function resolveAreaId(slug: string | undefined): Promise<string | null> {
  if (!slug) return null;
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("areas")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function ensureCsvSource(partnerId: string): Promise<string> {
  const supabase = getServiceSupabase();
  const { data: existing } = await supabase
    .from("rental_sources")
    .select("id")
    .eq("partner_id", partnerId)
    .eq("source_type", "csv")
    .eq("name", "default-csv")
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("rental_sources")
    .insert({
      partner_id: partnerId,
      source_type: "csv",
      name: "default-csv",
      is_active: true,
      config: { map_version: 1 },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

function pipeList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function upsertPropertyFromCsv(opts: {
  partnerId: string;
  businessId: string;
  sourceId: string;
  data: RentalCsvRow;
}): Promise<void> {
  const supabase = getServiceSupabase();
  const townId = await resolveTownId(opts.data.town_slug);
  if (!townId) throw new Error(`Unknown town_slug: ${opts.data.town_slug}`);
  const areaId = await resolveAreaId(opts.data.area_slug || undefined);

  const slug =
    opts.data.slug?.trim() ||
    slugifyRentalTitle(opts.data.title, opts.data.external_id);
  const fingerprint = rentalFingerprint({
    title: opts.data.title,
    townSlug: opts.data.town_slug,
    bedrooms: opts.data.bedrooms,
    externalId: opts.data.external_id,
  });

  const imageUrls = pipeList(opts.data.image_urls);
  const hero = imageUrls[0] ?? null;

  const row = {
    business_id: opts.businessId,
    partner_id: opts.partnerId,
    source_id: opts.sourceId,
    external_id: opts.data.external_id,
    slug,
    title: opts.data.title,
    description: opts.data.description || null,
    property_type: opts.data.property_type as RentalPropertyType,
    status: "pending_review" as const,
    town_id: townId,
    area_id: areaId,
    community_name: opts.data.community_name || null,
    bedrooms: opts.data.bedrooms,
    bathrooms: opts.data.bathrooms,
    sleeps: opts.data.sleeps,
    pets_allowed: opts.data.pets_allowed ?? null,
    private_pool: opts.data.private_pool ?? null,
    gulf_front: opts.data.gulf_front ?? null,
    gulf_view: opts.data.gulf_view ?? null,
    beach_access: (opts.data.beach_access as "none" | "public" | "private" | "unknown" | undefined) ?? null,
    golf_cart_included: opts.data.golf_cart_included ?? null,
    parking_notes: opts.data.parking_notes || null,
    rules: opts.data.rules || null,
    starting_nightly_rate: opts.data.starting_nightly_rate ?? null,
    pricing_reliable: opts.data.pricing_reliable === true,
    booking_url: opts.data.booking_url,
    map_lat: opts.data.lat ?? null,
    map_lng: opts.data.lng ?? null,
    fingerprint,
    hero_image_url: hero,
    content_rights_confirmed: false,
    last_synced_at: new Date().toISOString(),
    last_sync_status: "ok" as const,
    last_sync_error: null,
    removed_from_source_at: null,
    date_updated: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("rental_properties")
    .select("id")
    .eq("source_id", opts.sourceId)
    .eq("external_id", opts.data.external_id)
    .maybeSingle();

  let propertyId: string;
  if (existing?.id) {
    const { error } = await supabase
      .from("rental_properties")
      .update(row)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    propertyId = existing.id as string;
  } else {
    const { data: inserted, error } = await supabase
      .from("rental_properties")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    propertyId = inserted.id as string;
  }

  if (imageUrls.length) {
    await supabase.from("rental_images").delete().eq("property_id", propertyId);
    const images = imageUrls.map((url, i) => ({
      property_id: propertyId,
      storage_url: url,
      source_url: url,
      sort: i,
      rights_confirmed: false,
    }));
    const { error: imgErr } = await supabase.from("rental_images").insert(images);
    if (imgErr) throw new Error(imgErr.message);
  }
}

export async function previewRentalCsv(csvText: string): Promise<{
  headers: string[];
  total: number;
  valid: number;
  invalid: Array<{ row: number; errors: string[] }>;
  sample: RentalCsvRow[];
}> {
  const { headers, rows } = parseCsv(csvText);
  const validated = validateCsvRows(rows);
  const ok = validated.filter((v) => v.ok) as Array<{ ok: true; row: number; data: RentalCsvRow }>;
  const bad = validated.filter((v) => !v.ok) as Array<{ ok: false; row: number; errors: string[] }>;
  return {
    headers,
    total: rows.length,
    valid: ok.length,
    invalid: bad.map((b) => ({ row: b.row, errors: b.errors })),
    sample: ok.slice(0, 5).map((o) => o.data),
  };
}

export async function importRentalCsv(opts: {
  partnerId: string;
  businessId: string;
  csvText: string;
  createdBy?: string | null;
}): Promise<ImportCsvResult> {
  const supabase = getServiceSupabase();
  const sourceId = await ensureCsvSource(opts.partnerId);

  const { data: job, error: jobErr } = await supabase
    .from("rental_import_jobs")
    .insert({
      partner_id: opts.partnerId,
      source_id: sourceId,
      method: "csv",
      status: "running",
      started_at: new Date().toISOString(),
      created_by: opts.createdBy ?? null,
      stats: {},
    })
    .select("id")
    .single();
  if (jobErr) throw new Error(jobErr.message);
  const jobId = job.id as string;

  const { rows } = parseCsv(opts.csvText);
  const validated = validateCsvRows(rows);
  let rowsOk = 0;
  const errors: Array<{ row: number; errors: string[] }> = [];

  for (const item of validated) {
    if (!item.ok) {
      errors.push({ row: item.row, errors: item.errors });
      continue;
    }
    try {
      await upsertPropertyFromCsv({
        partnerId: opts.partnerId,
        businessId: opts.businessId,
        sourceId,
        data: item.data,
      });
      rowsOk += 1;
    } catch (e) {
      errors.push({
        row: item.row,
        errors: [e instanceof Error ? e.message : "Upsert failed"],
      });
    }
  }

  const status =
    rowsOk === 0 ? "failed" : errors.length > 0 ? "partial" : "succeeded";
  await supabase
    .from("rental_import_jobs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      stats: { rows_ok: rowsOk, rows_failed: errors.length, errors },
      error_log: errors.length ? JSON.stringify(errors.slice(0, 50)) : null,
    })
    .eq("id", jobId);

  await supabase
    .from("rental_sources")
    .update({
      last_success_at: rowsOk > 0 ? new Date().toISOString() : undefined,
      last_failure_at: errors.length ? new Date().toISOString() : undefined,
      last_error: errors[0]?.errors[0] ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  if (rowsOk > 0) {
    await supabase
      .from("rental_partner_profiles")
      .update({
        status: "import_pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", opts.partnerId)
      .in("status", ["approved", "import_pending", "active"]);
  }

  return { jobId, status, rowsOk, rowsFailed: errors.length, errors };
}
