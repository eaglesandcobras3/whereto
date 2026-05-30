import { getSiteUrl } from "@/lib/site-url";

const EXTRA_ORIGINS = (process.env.ASK_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function allowedOrigins(): string[] {
  const out: string[] = [];
  try {
    out.push(new URL(getSiteUrl()).origin);
  } catch {
    /* ignore */
  }
  if (process.env.NODE_ENV === "development") {
    out.push("http://localhost:3000", "http://127.0.0.1:3000");
  }
  return [...out, ...EXTRA_ORIGINS];
}

/** Browser requests must match site origin unless ASK_API_SECRET is used. */
export function validateAskOrigin(request: Request): boolean {
  const secret = process.env.ASK_API_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;

  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin fetch from Next may omit Origin on GET; POST from browser sends it.
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite === "same-origin") return true;
    return process.env.NODE_ENV === "development";
  }

  return allowedOrigins().includes(origin);
}
