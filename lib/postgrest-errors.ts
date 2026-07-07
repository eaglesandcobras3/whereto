import type { PostgrestError } from "@supabase/supabase-js";

/** PostgREST: relation does not exist (table/view missing in schema cache). */
export function isMissingRelationError(error: PostgrestError | null | undefined): boolean {
  return error?.code === "PGRST205";
}
