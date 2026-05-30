import {
  isListingRequestRateLimited,
  isSearchRateLimited,
  rateLimitKeyFromRequest,
} from "@/lib/rate-limit";

export { rateLimitKeyFromRequest };

type Bucket = { resetAt: number; count: number };
const askChatBuckets = new Map<string, Bucket>();

function askChatWindowMs(): number {
  const sec = Number(process.env.ASK_RATE_LIMIT_CHAT_WINDOW_SEC) || 600;
  return Math.max(60, sec) * 1000;
}

function askChatMax(): number {
  return Math.max(1, Number(process.env.ASK_RATE_LIMIT_CHAT_MAX) || 10);
}

function checkMemoryBucket(
  map: Map<string, Bucket>,
  key: string,
  windowMs: number,
  max: number,
): boolean {
  const now = Date.now();
  let b = map.get(key);
  if (!b || now >= b.resetAt) {
    b = { resetAt: now + windowMs, count: 0 };
    map.set(key, b);
  }
  if (b.count >= max) return true;
  b.count += 1;
  return false;
}

async function upstashLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "w30a-ask",
    });
    const { success } = await ratelimit.limit(key);
    return !success;
  } catch {
    return null;
  }
}

export async function isAskChatRateLimited(key: string): Promise<boolean> {
  if (process.env.DISABLE_ASK_RATE_LIMIT === "1") return false;

  const max = askChatMax();
  const windowSec = askChatWindowMs() / 1000;
  const upstash = await upstashLimit(`chat:${key}`, max, windowSec);
  if (upstash != null) return upstash;

  return checkMemoryBucket(askChatBuckets, key, askChatWindowMs(), max);
}

export async function isAskFeedbackRateLimited(key: string): Promise<boolean> {
  const upstash = await upstashLimit(`feedback:${key}`, 10, 3600);
  if (upstash != null) return upstash;
  return isListingRequestRateLimited(`ask-feedback:${key}`);
}

export async function isAskSubmissionRateLimited(key: string): Promise<boolean> {
  const upstash = await upstashLimit(`submit:${key}`, 3, 3600);
  if (upstash != null) return upstash;
  return isListingRequestRateLimited(`ask-submit:${key}`);
}

/** Re-export for workflow routes that share search limits. */
export { isSearchRateLimited };
