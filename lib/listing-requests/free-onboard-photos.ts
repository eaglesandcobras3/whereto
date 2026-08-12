import type { SupabaseClient } from "@supabase/supabase-js";
import type { FreeOnboardPhotoPayload } from "@/lib/listing-requests/free-onboard-schema";

function includedPhotos(photos: FreeOnboardPhotoPayload[] | undefined): FreeOnboardPhotoPayload[] {
  return (photos ?? []).filter((p) => p.include !== false);
}

/**
 * Insert free-intake gallery photos onto a business.
 * Skips URLs that already exist for that business (idempotent on re-approve paths).
 */
export async function attachFreeOnboardPhotos(
  supabase: SupabaseClient,
  businessId: string,
  photos: FreeOnboardPhotoPayload[] | undefined,
  status: "pending" | "approved",
): Promise<number> {
  const toAttach = includedPhotos(photos);
  if (toAttach.length === 0) return 0;

  const { data: existing } = await supabase
    .from("business_photos")
    .select("public_url")
    .eq("business_id", businessId)
    .in(
      "public_url",
      toAttach.map((p) => p.public_url),
    );

  const existingUrls = new Set(
    (existing ?? []).map((r) => String((r as { public_url: string }).public_url)),
  );

  const rows = toAttach
    .filter((p) => !existingUrls.has(p.public_url))
    .map((p, index) => ({
      business_id: businessId,
      public_url: p.public_url,
      storage_path: p.storage_path,
      status,
      is_hero: false,
      sort_order: index,
    }));

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("business_photos").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
