import { randomUUID, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type VariantName = "thumbnail" | "card" | "hero";

const VARIANTS: Record<VariantName, number> = {
  thumbnail: 320,
  card: 640,
  hero: 1600,
};

async function assertAdminOrThrow() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const serviceSupabase = getServiceSupabase();
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) throw new Error("Forbidden");
  return user.id;
}

function sanitizeFileName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
}

export async function POST(request: NextRequest) {
  try {
    const userId = await assertAdminOrThrow();
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "uploads").trim() || "uploads";
    const altText = String(formData.get("alt_text") ?? "").trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const base = sharp(bytes, { failOn: "none" }).rotate();
    const metadata = await base.metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: "Unsupported image file." }, { status: 400 });
    }

    const id = randomUUID();
    const safeName = sanitizeFileName(file.name || `${id}.jpg`);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const serviceSupabase = getServiceSupabase();
    const candidateBuckets = ["whereto-media", "cms-media", "business-images"] as const;
    let activeBucket: (typeof candidateBuckets)[number] = "whereto-media";

    const variantsOut: Record<string, { url: string; width: number; height: number; bytes: number }> = {};
    const uploadTasks = (Object.keys(VARIANTS) as VariantName[]).map(async (variant) => {
      const maxWidth = VARIANTS[variant];
      const transformed = await base
        .clone()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 })
        .toBuffer({ resolveWithObject: true });

      const path = `${folder}/${id}/${variant}-${safeName.replace(/\.[^.]+$/, "")}.webp`;
      let uploaded = false;
      let lastErr: string | null = null;
      for (const bucket of candidateBuckets) {
        const storage = serviceSupabase.storage.from(bucket);
        const { error } = await storage.upload(path, transformed.data, {
          contentType: "image/webp",
          upsert: true,
        });
        if (!error) {
          activeBucket = bucket;
          uploaded = true;
          break;
        }
        lastErr = error.message;
      }
      if (!uploaded) {
        throw new Error(
          lastErr ?? "Upload failed. Ensure whereto-media (or cms-media / business-images) bucket exists.",
        );
      }
      const publicUrl = serviceSupabase.storage.from(activeBucket).getPublicUrl(path).data.publicUrl;
      variantsOut[variant] = {
        url: publicUrl,
        width: transformed.info.width,
        height: transformed.info.height,
        bytes: transformed.info.size,
      };
    });
    await Promise.all(uploadTasks);

    const hero = variantsOut.hero ?? variantsOut.card ?? variantsOut.thumbnail;
    const objectPath = `${folder}/${id}/hero-${safeName.replace(/\.[^.]+$/, "")}.webp`;
    const { error: insertErr } = await serviceSupabase.from("media_assets").insert({
      bucket: activeBucket,
      object_path: objectPath,
      public_url: hero.url,
      mime_type: "image/webp",
      byte_size: hero.bytes,
      width: hero.width,
      height: hero.height,
      checksum,
      variants: variantsOut,
      alt_text: altText,
      created_by: userId,
    });
    if (insertErr) {
      // Upload should still succeed even when optional media_assets metadata table is unavailable.
      console.warn("media_assets insert skipped:", insertErr.message);
    }

    return NextResponse.json({ ok: true, url: hero.url, variants: variantsOut, bucket: activeBucket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

