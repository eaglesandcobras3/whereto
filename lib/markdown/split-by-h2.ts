export type MarkdownH2Section = {
  title: string | null;
  body: string;
};

/** Split markdown into sections at `##` headings. Content before the first heading has `title: null`. */
export function splitMarkdownByH2(content: string): MarkdownH2Section[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/^## /m);
  const sections: MarkdownH2Section[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]?.trim();
    if (!part) continue;

    if (i === 0 && !trimmed.startsWith("##")) {
      sections.push({ title: null, body: part });
      continue;
    }

    const newline = part.indexOf("\n");
    const title = newline === -1 ? part.trim() : part.slice(0, newline).trim();
    const body = newline === -1 ? "" : part.slice(newline + 1).trim();
    sections.push({ title: title || "Section", body });
  }

  return sections;
}
