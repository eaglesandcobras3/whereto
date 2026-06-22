import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PUBLIC_IMAGE_BUCKET } from "@/lib/media/public-image-url";

const CANDIDATE_BUCKETS = [
  DEFAULT_PUBLIC_IMAGE_BUCKET,
  "whereto-media",
  "cms-media",
  "business-images",
] as const;

const HERO_MAX_WIDTH = 1600;

function storageObjectPath(slug: string): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `guides/rankscore/${safe || "guide"}/hero.webp`;
}

/** Download an external hero (e.g. Pexels) and store in Supabase for guide thumbnails. */
export async function mirrorGuideHeroToStorage(
  supabase: SupabaseClient,
  opts: { sourceUrl: string; slug: string },
): Promise<string | null> {
  const sourceUrl = String(opts.sourceUrl ?? "").trim();
  if (!/^https?:\/\//i.test(sourceUrl)) return null;

  const response = await fetch(sourceUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`hero download failed (${response.status})`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const webp = await sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({ width: HERO_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();

  const objectPath = storageObjectPath(opts.slug);
  let lastErr: string | null = null;

  for (const bucket of CANDIDATE_BUCKETS) {
    const { error } = await supabase.storage.from(bucket).upload(objectPath, webp, {
      contentType: "image/webp",
      upsert: true,
    });
    if (!error) {
      return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
    }
    lastErr = error.message;
  }

  throw new Error(lastErr ?? "hero upload failed");
}
