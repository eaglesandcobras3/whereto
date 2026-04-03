/**
 * Multiple Text Search query variants per category + town (implementation plan §3).
 * Uses display names from DB, not slugs.
 */
export function expandDiscoveryQueries(input: {
  categoryName: string;
  townName: string;
}): string[] {
  const cat = input.categoryName.trim();
  const town = input.townName.trim();
  if (!cat || !town) return [];

  const lowerCat = cat.toLowerCase();
  return [
    `${lowerCat} in ${town} FL`,
    `${lowerCat} near ${town} Florida`,
    `${lowerCat} ${town} 30A`,
    `best ${lowerCat} ${town}`,
    `${lowerCat} around ${town} beach`,
  ];
}
