import { getSiteUrl } from "@/lib/site-url";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export function indexNowConfig(): {
  key: string;
  keyLocation: string;
  host: string;
} | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return null;

  const siteUrl = getSiteUrl();
  let host: string;
  try {
    host = new URL(siteUrl).hostname;
  } catch {
    return null;
  }

  return {
    key,
    keyLocation: `${siteUrl}/${encodeURIComponent(key)}.txt`,
    host,
  };
}

/** Notify Bing/Yandex/etc. that URLs changed (IndexNow). No-op when INDEXNOW_KEY is unset. */
export async function submitUrlsToIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number }> {
  const config = indexNowConfig();
  if (!config || urls.length === 0) return { ok: false };

  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  if (unique.length === 0) return { ok: false };

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: config.host,
      key: config.key,
      keyLocation: config.keyLocation,
      urlList: unique.slice(0, 10_000),
    }),
  });

  return { ok: res.ok, status: res.status };
}
