export function townIntentPath(townSlug: string, intentSlug: string): string {
  return `/town/${encodeURIComponent(townSlug.trim())}/${encodeURIComponent(intentSlug.trim())}`;
}
