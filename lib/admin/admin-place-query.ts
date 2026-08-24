import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

/** Supabase/Postgres errors when optional migration columns are not applied yet. */
export function isOptionalSchemaColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("schema cache")
  );
}

export async function queryRowWithSelectFallback<T extends Record<string, unknown>>(opts: {
  run: (select: string) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
  selectVariants: string[];
}): Promise<{ data: T | null; error: PostgrestError | null }> {
  let lastError: PostgrestError | null = null;
  for (const select of opts.selectVariants) {
    const { data, error } = await opts.run(select);
    if (!error) return { data, error: null };
    lastError = error;
    if (!isOptionalSchemaColumnError(error.message)) {
      return { data: null, error };
    }
  }
  return { data: null, error: lastError };
}
