/**
 * Public footer social links. Production defaults: @whereto30a on Instagram and TikTok.
 * Override with env for staging/other handles; set env to an empty string to hide a link.
 */

const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/whereto30a/";
const DEFAULT_TIKTOK_URL = "https://www.tiktok.com/@whereto30a";

export function getSiteInstagramUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  if (raw !== undefined && raw.trim() === "") return undefined;
  const u = raw?.trim();
  return u || DEFAULT_INSTAGRAM_URL;
}

export function getSiteTikTokUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_TIKTOK_URL;
  if (raw !== undefined && raw.trim() === "") return undefined;
  const u = raw?.trim();
  return u || DEFAULT_TIKTOK_URL;
}
