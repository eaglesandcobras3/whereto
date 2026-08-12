import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Max longest edge for portal / rental / business photo uploads (WebP). */
export const PORTAL_IMAGE_MAX_DIMENSION = 1600;

const VARIANTS = { hero: PORTAL_IMAGE_MAX_DIMENSION, card: 640, thumbnail: 320 } as const;

function sanitizeFileName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
}

export async function uploadPortalImage(
  supabase: SupabaseClient,
  file: File,
  folder: string,
): Promise<{ publicUrl: string; storagePath: string; bucket: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const base = sharp(bytes, { failOn: "none" }).rotate();
  const metadata = await base.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Unsupported image file.");
  }

  const id = randomUUID();
  const safeName = sanitizeFileName(file.name || `${id}.jpg`);
  const candidateBuckets = ["whereto30a-media", "whereto-media", "cms-media", "business-images"] as const;
  let activeBucket: (typeof candidateBuckets)[number] = "whereto30a-media";

  // Fit inside max×max so neither edge exceeds the limit (portrait or landscape).
  const transformed = await base
    .resize({
      width: VARIANTS.hero,
      height: VARIANTS.hero,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  const path = `${folder}/${id}/hero-${safeName.replace(/\.[^.]+$/, "")}.webp`;
  let uploaded = false;
  let lastErr: string | null = null;

  for (const bucket of candidateBuckets) {
    const storage = supabase.storage.from(bucket);
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
    throw new Error(lastErr ?? "Upload failed.");
  }

  const publicUrl = supabase.storage.from(activeBucket).getPublicUrl(path).data.publicUrl;

  return { publicUrl, storagePath: path, bucket: activeBucket };
}
