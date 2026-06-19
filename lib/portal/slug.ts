/** URL-safe slug from a business title. */
export function slugifyBusinessTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Pick a unique slug against an existing set (mutates the set when a new slug is chosen). */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugifyBusinessTitle(base) || "business";
  if (!taken.has(root)) {
    taken.add(root);
    return root;
  }
  for (let n = 2; n < 100; n++) {
    const candidate = `${root}-${n}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  const fallback = `${root}-${Date.now().toString(36)}`;
  taken.add(fallback);
  return fallback;
}
