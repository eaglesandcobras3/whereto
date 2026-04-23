/**
 * Resolve public image URLs for the Next app.
 *
 * - Full `https?://…` (or `//…`) → returned as-is (after normalizing `//` to `https://`).
 * - Directus UUID (36-char UUID format) → `NEXT_PUBLIC_DIRECTUS_URL` + `/assets/{uuid}`.
 * - Relative values → `NEXT_PUBLIC_SUPABASE_URL` + `/storage/v1/object/public/{bucket}/{key}`.
 *   Default bucket: `NEXT_PUBLIC_IMAGE_STORAGE_BUCKET` or `whereto-media`.
 *   If the path starts with a known public bucket name (`whereto-media`, `cms-media`, `business-images`), that
 *   first segment is used as the bucket and the rest is the object key.
 */

const KNOWN_BUCKETS = ["whereto-media", "cms-media", "business-images"] as const;

// Matches Directus-style UUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function directusOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_DIRECTUS_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function defaultBucket(): string {
  return process.env.NEXT_PUBLIC_IMAGE_STORAGE_BUCKET?.trim() || "whereto-media";
}

function supabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function splitBucketAndKey(relative: string): { bucket: string; key: string } {
  const path = relative.replace(/^\/+/, "");
  const first = path.split("/")[0];
  if (first && (KNOWN_BUCKETS as readonly string[]).includes(first)) {
    return { bucket: first, key: path.slice(first.length + 1).replace(/^\/+/, "") };
  }
  return { bucket: defaultBucket(), key: path };
}

function encodeObjectKey(key: string): string {
  return key
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
}

/**
 * @param raw — `null` / full URL / or storage key (optionally `bucket/...` for known buckets)
 */
export function getPublicImageUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;

  // Directus UUID format: convert to Directus asset URL
  if (UUID_REGEX.test(s)) {
    const directus = directusOrigin();
    if (directus) {
      return `${directus}/assets/${s}`;
    }
    // Fall through to Supabase if no Directus URL configured
  }

  const base = supabaseOrigin();
  if (!base) return null;

  const { bucket, key } = splitBucketAndKey(s);
  if (!key) return null;
  return `${base}/storage/v1/object/public/${bucket}/${encodeObjectKey(key)}`;
}
