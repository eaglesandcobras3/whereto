/**
 * In-memory fixed window per key (e.g. client IP).
 * On multi-instance/serverless deploys each instance has its own map — good enough as a baseline;
 * use Redis/Vercel KV for strict global limits.
 */

type Bucket = { resetAt: number; count: number };

const buckets = new Map<string, Bucket>();

/** Clears counters (Vitest only). */
export function resetSearchRateLimitForTests() {
  buckets.clear();
}

function windowMs(): number {
  const sec = Number(process.env.SEARCH_RATE_LIMIT_WINDOW_SEC) || 60;
  return Math.max(10, sec) * 1000;
}

function maxHits(): number {
  const n = Number(process.env.SEARCH_RATE_LIMIT_MAX) || 40;
  return Math.max(1, n);
}

export function isSearchRateLimited(key: string): boolean {
  if (process.env.DISABLE_SEARCH_RATE_LIMIT === "1") return false;
  const now = Date.now();
  const w = windowMs();
  const max = maxHits();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { resetAt: now + w, count: 0 };
    buckets.set(key, b);
  }
  if (b.count >= max) return true;
  b.count += 1;
  return false;
}

export function rateLimitKeyFromRequest(request: Request): string {
  const h = request.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}

/* --------------------------------------------------------------------------
   Listing request form (public /api/listing-requests)
   Claim / correction email from business pages (public /api/business-claim-email)
   Separate bucket keys (`listing-req:…`, `biz-claim-email:…`), same LISTING_REQUEST_* tuneables.
   -------------------------------------------------------------------------- */

const listingBuckets = new Map<string, Bucket>();

/** Clears listing-request counters (Vitest only). */
export function resetListingRequestRateLimitForTests() {
  listingBuckets.clear();
}

function listingWindowMs(): number {
  const sec = Number(process.env.LISTING_REQUEST_RATE_LIMIT_WINDOW_SEC) || 3600;
  return Math.max(60, sec) * 1000;
}

function listingMaxHits(): number {
  const n = Number(process.env.LISTING_REQUEST_RATE_LIMIT_MAX) || 5;
  return Math.max(1, n);
}

/** ~5 submissions / hour / IP by default (see LISTING_REQUEST_* env). */
export function isListingRequestRateLimited(key: string): boolean {
  if (process.env.DISABLE_LISTING_REQUEST_RATE_LIMIT === "1") return false;
  const now = Date.now();
  const w = listingWindowMs();
  const max = listingMaxHits();
  let b = listingBuckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { resetAt: now + w, count: 0 };
    listingBuckets.set(key, b);
  }
  if (b.count >= max) return true;
  b.count += 1;
  return false;
}
