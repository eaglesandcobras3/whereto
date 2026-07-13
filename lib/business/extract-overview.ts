import { splitMarkdownByH2 } from "@/lib/markdown/split-by-h2";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";

/**
 * Pull the overview / opening copy from business markdown `content`.
 *
 * Matches the business page "Overview" section: text before the first `##`
 * heading. When there are no H2s, returns the first paragraph only.
 * Does not rewrite copy — only selects a slice of the existing markdown.
 */
export function extractOverviewFromContent(
  content: string | null | undefined,
  title?: string | null,
): string | null {
  if (!content?.trim()) return null;

  let markdown = content.trim();
  if (title?.trim()) {
    markdown = stripLeadingH1MatchingTitle(markdown, title).trim();
  }
  if (!markdown) return null;

  const sections = splitMarkdownByH2(markdown);
  const first = sections[0];
  if (!first) return null;

  // Starts at an H2 — no overview preamble.
  if (first.title !== null) return null;

  const preamble = first.body.trim();
  if (!preamble) return null;

  // Multiple H2 sections: the full untitled preamble is the Overview section.
  if (sections.length > 1) return preamble;

  // No H2s: take the opening paragraph only (through the first blank line).
  const paragraphBreak = preamble.search(/\n\s*\n/);
  if (paragraphBreak === -1) return preamble;
  return preamble.slice(0, paragraphBreak).trim() || null;
}
