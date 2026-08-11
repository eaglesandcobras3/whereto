import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { busyDatesToAvailability, parseIcalBusyDates } from "@/lib/stays/adapters/ical";
import { RENTAL_STALE_DAYS } from "@/lib/stays/constants";

export async function syncPropertyIcal(opts: {
  propertyId: string;
  sourceId?: string | null;
  icalText: string;
}): Promise<{ blockedDays: number }> {
  const supabase = getServiceSupabase();
  const busy = parseIcalBusyDates(opts.icalText);
  const rows = busyDatesToAvailability(busy).map((d) => ({
    property_id: opts.propertyId,
    source_id: opts.sourceId ?? null,
    date: d.date,
    is_available: false,
    updated_at: new Date().toISOString(),
  }));

  // Replace near-term blocked set: delete existing then insert
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 400);
  await supabase
    .from("rental_availability")
    .delete()
    .eq("property_id", opts.propertyId)
    .gte("date", new Date().toISOString().slice(0, 10))
    .lte("date", horizon.toISOString().slice(0, 10));

  if (rows.length) {
    const { error } = await supabase.from("rental_availability").insert(rows);
    if (error) throw new Error(error.message);
  }

  await supabase
    .from("rental_properties")
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: "ok",
      last_sync_error: null,
      date_updated: new Date().toISOString(),
    })
    .eq("id", opts.propertyId);

  return { blockedDays: rows.length };
}

/** Mark properties without recent sync as stale (does not auto-unpublish). */
export async function markStaleRentalInventory(): Promise<{ marked: number }> {
  const supabase = getServiceSupabase();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RENTAL_STALE_DAYS);
  const { data, error } = await supabase
    .from("rental_properties")
    .update({ last_sync_status: "stale" })
    .eq("status", "published")
    .lt("last_synced_at", cutoff.toISOString())
    .neq("last_sync_status", "stale")
    .select("id");
  if (error) throw new Error(error.message);
  return { marked: data?.length ?? 0 };
}
