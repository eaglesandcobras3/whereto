/**
 * If markdown starts with a single H1 whose text matches any of `titles`
 * (case-insensitive), remove it so the page shell `<h1>` stays the single
 * visible title.
 */
export function stripLeadingH1MatchingTitle(
  markdown: string,
  titleOrTitles: string | string[],
): string {
  const titles = (Array.isArray(titleOrTitles) ? titleOrTitles : [titleOrTitles])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (titles.length === 0) return markdown;
  const titleSet = new Set(titles);

  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return markdown;
  const m = /^(#{1})\s+(.+)$/.exec(lines[i].trim());
  if (!m || m[1] !== "#") return markdown;
  const headingText = m[2].trim().toLowerCase();
  if (!titleSet.has(headingText)) return markdown;
  const rest = lines.slice(i + 1).join("\n").replace(/^\n+/, "");
  return rest;
}
