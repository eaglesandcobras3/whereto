export function areaIntentPath(areaSlug: string, intentSlug: string): string {
  return `/area/${encodeURIComponent(areaSlug.trim())}/${encodeURIComponent(intentSlug.trim())}`;
}
