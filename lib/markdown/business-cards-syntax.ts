/**
 * Wiki-style business embeds for markdown:
 * - List item: `- [[business-slug]] — optional blurb shown on the card`
 * - Standalone line: `[[business-slug]] — optional blurb`
 *
 * These lines are rewritten to internal markdown links before `react-markdown`
 * runs; `MarkdownRenderer` maps those links to real listing cards.
 */

const LIST_ITEM_CARD = /^(\s*[-*+]\s+)\[\[([a-zA-Z0-9][a-zA-Z0-9-]*)\]\](?:\s*[—–-]\s*(.+))?$/;
const STANDALONE_CARD = /^\[\[([a-zA-Z0-9][a-zA-Z0-9-]*)\]\](?:\s*[—–-]\s*(.+))?$/;

/** Escape title text for a CommonMark / GFM inline link title in double quotes. */
export function escapeMarkdownLinkTitle(title: string): string {
  return title.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
}

function toPlaceholderLink(slug: string, note: string): string {
  const t = note.trim();
  const titlePart = t ? ` "${escapeMarkdownLinkTitle(t)}"` : "";
  // Word joiner as link label so the line stays valid markdown with no visible label text.
  return `\n[\u2060](whereto-card:${slug}${titlePart})\n`;
}

/** Collect unique business slugs referenced with `[[slug]]` syntax. */
export function extractBusinessCardSlugs(markdown: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    let m = line.match(LIST_ITEM_CARD);
    if (m) {
      const slug = m[2];
      if (!seen.has(slug)) {
        seen.add(slug);
        order.push(slug);
      }
      continue;
    }
    m = line.match(STANDALONE_CARD);
    if (m) {
      const slug = m[1];
      if (!seen.has(slug)) {
        seen.add(slug);
        order.push(slug);
      }
    }
  }
  return order;
}

/** Rewrite `[[slug]]` lines into `whereto-card:` links for the markdown renderer. */
export function preprocessMarkdownForBusinessCards(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      let m = line.match(LIST_ITEM_CARD);
      if (m) {
        const slug = m[2];
        const note = (m[3] ?? "").trim();
        return toPlaceholderLink(slug, note);
      }
      m = line.match(STANDALONE_CARD);
      if (m) {
        return toPlaceholderLink(m[1], (m[2] ?? "").trim());
      }
      return line;
    })
    .join("\n");
}
