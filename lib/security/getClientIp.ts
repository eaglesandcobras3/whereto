/** Client IP from reverse-proxy headers. */
export function getClientIp(request: Request): string {
  const h = request.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}
