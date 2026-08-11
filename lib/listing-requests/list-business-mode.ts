/** Entry modes for `/list-your-business`. */

export type ListBusinessMode = "new" | "find" | "slug";

export type ListBusinessModeParams = {
  business?: string | null;
  new?: string | null;
};

/** True for `?new`, `?new=1`, `?new=true`, `?new=yes`. */
export function isNewListingFlag(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  return v === "" || v === "1" || v === "true" || v === "yes";
}

/**
 * Resolve intake mode from URL params.
 * `?business=` wins over `?new=` so verify-this-listing links stay updates.
 */
export function resolveListBusinessMode(
  params: ListBusinessModeParams,
): ListBusinessMode {
  if (params.business?.trim()) return "slug";
  if (isNewListingFlag(params.new)) return "new";
  return "find";
}
