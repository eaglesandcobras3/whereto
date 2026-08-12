import "server-only";

import { uploadPortalImage } from "@/lib/portal/storage-upload";
import { RENTAL_LISTING_MAX_PHOTOS } from "@/lib/stays/constants";
import type { RentalListingSubmission } from "@/lib/stays/listing-submission-schema";
import { slugifyRentalTitle } from "@/lib/stays/slug";
import { getServiceSupabase } from "@/lib/supabase/service-role";

function randomSuffix(len = 4): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return out;
}

async function uniquePropertySlug(supabase: ReturnType<typeof getServiceSupabase>, title: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = slugifyRentalTitle(title, randomSuffix(attempt === 0 ? 4 : 6));
    const { data } = await supabase
      .from("rental_properties")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  return slugifyRentalTitle(title, `${Date.now().toString(36)}`);
}

async function resolvePartnerForSubmission(
  supabase: ReturnType<typeof getServiceSupabase>,
  body: RentalListingSubmission,
): Promise<{ partnerId: string; businessId: string | null; created: boolean }> {
  const { data: existing } = await supabase
    .from("rental_partner_profiles")
    .select("id, status, business_id")
    .eq("contact_email", body.contact_email)
    .order("created_at", { ascending: false })
    .limit(8);

  const rows = (existing ?? []) as Array<{
    id: string;
    status: string;
    business_id: string | null;
  }>;
  const usable = rows.find((r) =>
    ["draft", "submitted", "under_review", "approved", "import_pending", "active", "paused"].includes(
      r.status,
    ),
  );

  if (usable) {
    return {
      partnerId: usable.id,
      businessId: usable.business_id,
      created: false,
    };
  }

  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from("rental_partner_profiles")
    .insert({
      display_name: body.display_name,
      contact_name: body.contact_name,
      contact_email: body.contact_email,
      contact_phone: body.contact_phone,
      show_public_business_profile: false,
      business_id: null,
      status: "submitted",
      import_method: "manual",
      authority_attested_at: now,
      content_rights_attested_at: now,
      application_payload: {
        source: "listing_submission",
        display_name: body.display_name,
        notes: body.notes,
      },
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from("portal_review_items")
    .insert({
      type: "rental_partner_application",
      status: "pending",
      business_id: null,
      submitted_by: null,
      payload: {
        partner_id: created.id,
        source: "listing_submission",
        display_name: body.display_name,
      },
    })
    .then(({ error: reviewErr }) => {
      if (reviewErr) console.error("rental partner review queue insert:", reviewErr.message);
    });

  return { partnerId: created.id as string, businessId: null, created: true };
}

export async function submitRentalListing(
  body: RentalListingSubmission,
  photos: File[] = [],
): Promise<{
  propertyId: string;
  partnerId: string;
  slug: string;
  partnerCreated: boolean;
  photoCount: number;
}> {
  if (body._hp_company_website) {
    throw new Error("Rejected");
  }

  if (photos.length === 0) {
    throw new Error("Add a main photo for the listing card.");
  }
  if (photos.length > RENTAL_LISTING_MAX_PHOTOS) {
    throw new Error(`You can upload up to ${RENTAL_LISTING_MAX_PHOTOS} photos.`);
  }
  for (const file of photos) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Photos must be image files.");
    }
    if (file.size > 12 * 1024 * 1024) {
      throw new Error("Each photo must be under 12MB.");
    }
  }

  const supabase = getServiceSupabase();
  const { partnerId, businessId, created: partnerCreated } = await resolvePartnerForSubmission(
    supabase,
    body,
  );

  const slug = await uniquePropertySlug(supabase, body.title);
  const now = new Date().toISOString();

  const { data: property, error } = await supabase
    .from("rental_properties")
    .insert({
      partner_id: partnerId,
      business_id: businessId,
      slug,
      title: body.title,
      description: body.description,
      property_type: body.property_type,
      status: "pending_review",
      town_id: body.town_id,
      area_id: body.area_id ?? null,
      community_name: body.community_name,
      street_address: body.street_address,
      postal_code: body.postal_code,
      map_lat: body.map_lat ?? null,
      map_lng: body.map_lng ?? null,
      location_precision: body.location_precision,
      bedrooms: body.bedrooms,
      bathrooms: body.bathrooms,
      sleeps: body.sleeps,
      booking_url: body.booking_url,
      hero_image_url: null,
      starting_nightly_rate: body.starting_nightly_rate ?? null,
      beach_access: body.beach_access ?? "unknown",
      pets_allowed: body.pets_allowed ?? null,
      private_pool: body.private_pool ?? null,
      gulf_front: body.gulf_front ?? null,
      gulf_view: body.gulf_view ?? null,
      golf_cart_included: body.golf_cart_included ?? null,
      content_rights_confirmed: true,
      featured: false,
      date_updated: now,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const propertyId = property.id as string;
  let heroFromUpload: string | null = null;
  let photoCount = 0;

  for (let i = 0; i < photos.length; i++) {
    const file = photos[i]!;
    const uploaded = await uploadPortalImage(
      supabase,
      file,
      `rentals/${partnerId}/${propertyId}`,
    );
    const { error: imgErr } = await supabase.from("rental_images").insert({
      property_id: propertyId,
      storage_url: uploaded.publicUrl,
      sort: i,
      alt: body.title,
      rights_confirmed: true,
    });
    if (imgErr) throw new Error(imgErr.message);
    if (i === 0) heroFromUpload = uploaded.publicUrl;
    photoCount += 1;
  }

  if (heroFromUpload) {
    await supabase
      .from("rental_properties")
      .update({ hero_image_url: heroFromUpload, date_updated: now })
      .eq("id", propertyId);
  }

  await supabase
    .from("portal_review_items")
    .insert({
      type: "rental_listing_submission",
      status: "pending",
      business_id: businessId,
      submitted_by: null,
      payload: {
        property_id: propertyId,
        partner_id: partnerId,
        slug,
        title: body.title,
        contact_email: body.contact_email,
        notes: body.notes,
        photo_count: photoCount,
        has_street_address: Boolean(body.street_address),
        source: "public_list_your_rentals",
      },
    })
    .then(({ error: reviewErr }) => {
      if (reviewErr) console.error("rental listing review queue insert:", reviewErr.message);
    });

  return {
    propertyId,
    partnerId,
    slug,
    partnerCreated,
    photoCount,
  };
}
