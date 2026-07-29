/**
 * Per-user fixed-window rate limit for community tip writes.
 * Complements IP-based listing limits; serverless instances are best-effort.
 */

type Bucket = { resetAt: number; count: number };

const buckets = new Map<string, Bucket>();

export function resetCommunityTipsRateLimitForTests() {
  buckets.clear();
}

function windowMs(): number {
  const sec = Number(process.env.COMMUNITY_TIPS_RATE_LIMIT_WINDOW_SEC) || 24 * 60 * 60;
  return Math.max(60, sec) * 1000;
}

function maxHits(): number {
  const n = Number(process.env.COMMUNITY_TIPS_RATE_LIMIT_MAX) || 5;
  return Math.max(1, n);
}

/** ~5 tip writes / 24h / user by default (COMMUNITY_TIPS_RATE_LIMIT_*). */
export function isCommunityTipsUserRateLimited(userId: string): boolean {
  if (process.env.DISABLE_COMMUNITY_TIPS_RATE_LIMIT === "1") return false;
  const key = `community-tips:${userId}`;
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
