import { NextRequest, NextResponse } from "next/server";
import { businessPhotosApiBlocked, onboardApiBlocked } from "@/lib/feature-flags";
import { getBusinessPlan } from "@/lib/portal/entitlements";
import { sendPortalOwnerEmail } from "@/lib/portal/notifications";
import { requireBusinessMember } from "@/lib/portal/require-business-member";
import { uploadPortalImage } from "@/lib/portal/storage-upload";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ businessId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const onboardBlocked = await onboardApiBlocked();
  if (onboardBlocked) return onboardBlocked;
  const photosBlocked = await businessPhotosApiBlocked();
  if (photosBlocked) return photosBlocked;

  const { businessId } = await context.params;
  const member = await requireBusinessMember(businessId);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const { data: photos, error } = await supabase
    .from("business_photos")
    .select("id, public_url, status, is_hero, sort_order, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { planSlug, entitlements } = await getBusinessPlan(supabase, businessId);

  return NextResponse.json({ photos: photos ?? [], plan: planSlug, entitlements });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const onboardBlocked = await onboardApiBlocked();
  if (onboardBlocked) return onboardBlocked;
  const photosBlocked = await businessPhotosApiBlocked();
  if (photosBlocked) return photosBlocked;

  const { businessId } = await context.params;
  const member = await requireBusinessMember(businessId);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  const isHero = String(formData.get("is_hero") ?? "") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { entitlements } = await getBusinessPlan(supabase, businessId);

  const { count } = await supabase
    .from("business_photos")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .in("status", ["pending", "approved"]);

  if ((count ?? 0) >= entitlements.max_photos) {
    return NextResponse.json(
      {
        error: `Photo limit reached (${entitlements.max_photos}). Upgrade to Local Partner for more photos.`,
        code: "photo_limit",
      },
      { status: 403 },
    );
  }

  const { data: biz } = await supabase.from("businesses").select("title").eq("id", businessId).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  let uploaded: { publicUrl: string; storagePath: string };
  try {
    uploaded = await uploadPortalImage(supabase, file, `portal/${businessId}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (isHero) {
    await supabase
      .from("business_photos")
      .update({ is_hero: false })
      .eq("business_id", businessId)
      .in("status", ["pending", "approved"]);
  }

  const { data: photo, error: photoErr } = await supabase
    .from("business_photos")
    .insert({
      business_id: businessId,
      uploaded_by: member.userId,
      public_url: uploaded.publicUrl,
      storage_path: uploaded.storagePath,
      status: "pending",
      is_hero: isHero,
    })
    .select("id")
    .single();

  if (photoErr || !photo) {
    return NextResponse.json({ error: photoErr?.message ?? "Could not save photo" }, { status: 500 });
  }

  const businessTitle = String(biz.title ?? "your business");

  const { data: reviewItem, error: reviewErr } = await supabase
    .from("portal_review_items")
    .insert({
      type: "photo",
      status: "pending",
      business_id: businessId,
      submitted_by: member.userId,
      payload: {
        photo_id: photo.id,
        business_title: businessTitle,
        public_url: uploaded.publicUrl,
        is_hero: isHero,
      },
    })
    .select("id")
    .single();

  if (reviewErr || !reviewItem) {
    return NextResponse.json({ error: reviewErr?.message ?? "Could not queue review" }, { status: 500 });
  }

  await supabase
    .from("business_photos")
    .update({ review_item_id: reviewItem.id })
    .eq("id", photo.id);

  const { data: user } = await supabase.auth.admin.getUserById(member.userId);
  if (user.user?.email) {
    await sendPortalOwnerEmail({
      to: user.user.email,
      event: "photo_submitted",
      businessTitle,
    });
  }

  return NextResponse.json({ ok: true, photo_id: photo.id, review_item_id: reviewItem.id });
}
