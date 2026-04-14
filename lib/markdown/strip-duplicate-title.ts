/**
 * If markdown starts with a single H1 whose text matches `title` (case-insensitive),
 * remove it so the page shell can own the title — or omit the shell title and use this
 * to avoid duplicate headings when content was authored with a leading `# Title`.
 */
export function stripLeadingH1MatchingTitle(markdown: string, title: string): string {
  const t = title.trim().toLowerCase();
  if (!t) return markdown;
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return markdown;
  const m = /^(#{1})\s+(.+)$/.exec(lines[i].trim());
  if (!m || m[1] !== "#") return markdown;
  const headingText = m[2].trim().toLowerCase();
  if (headingText !== t) return markdown;
  const rest = lines.slice(i + 1).join("\n").replace(/^\n+/, "");
  return rest;
}
