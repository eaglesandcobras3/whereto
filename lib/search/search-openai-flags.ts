/**
 * Server-side toggles for OpenAI spend on user-facing search (`runSearch`, `/api/search`, `/search`).
 * Defaults preserve existing behavior.
 */

function readEnvFlag(name: string, defaultOn: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === undefined || v === "") return defaultOn;
  const off = ["0", "false", "no", "off", "disabled"];
  const on = ["1", "true", "yes", "on", "enabled"];
  if (off.includes(v)) return false;
  if (on.includes(v)) return true;
  return defaultOn;
}

/** When false, search skips `text-embedding-3-small` for the query (no per-search embedding bill). */
export function searchQueryEmbeddingsEnabled(): boolean {
  return readEnvFlag("SEARCH_QUERY_EMBEDDINGS", true);
}

/** When false, search never calls `parseIntentWithOpenAI` — keyword heuristics + `repairFoodCategoryWhenQueryIsRetail` only. */
export function searchOpenAiIntentParseEnabled(): boolean {
  return readEnvFlag("SEARCH_OPENAI_INTENT_PARSE", true);
}
