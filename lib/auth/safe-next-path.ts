const SAFE_NEXT_BASE_URL = "https://internal.whereto30a.local";

/**
 * Accept only same-origin relative paths for post-auth redirects.
 * Reject protocol-relative (`//...`) and absolute URLs.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback: string,
): string {
  const candidate = raw?.trim();
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;

  try {
    const parsed = new URL(candidate, SAFE_NEXT_BASE_URL);
    if (parsed.origin !== SAFE_NEXT_BASE_URL) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
