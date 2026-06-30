/** Reject content that looks like a full HTML document rather than markdown. */
const HTML_DOC_PATTERN = /^\s*<!DOCTYPE\s+html|<html[\s>]/i;

/** Rough check: more tag-like HTML than markdown structure. */
function looksLikeRawHtml(text: string): boolean {
  const trimmed = text.trim();
  if (HTML_DOC_PATTERN.test(trimmed)) return true;
  const htmlTags = (trimmed.match(/<\/?[a-z][\s\S]*?>/gi) ?? []).length;
  const mdSignals =
    (trimmed.match(/^#{1,6}\s/mg) ?? []).length +
    (trimmed.match(/^\s*[-*+]\s/mg) ?? []).length +
    (trimmed.match(/^\s*\d+\.\s/mg) ?? []).length +
    (trimmed.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
  return htmlTags > 8 && mdSignals < 2;
}

export type MarkdownValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateGuideMarkdown(content: string): MarkdownValidationResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, error: "Content is required (markdown body)." };
  }
  if (looksLikeRawHtml(trimmed)) {
    return {
      ok: false,
      error: "Content must be markdown, not HTML. Paste markdown text only.",
    };
  }
  return { ok: true };
}

/** Estimate reading time from word count (~200 wpm). */
export function estimateReadingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
