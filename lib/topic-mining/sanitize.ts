/**
 * Deterministic redaction for ephemeral topic-mining input.
 * Output is still sensitive in memory — never log or persist full strings.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;
const HANDLE_RE = /@[\w.]{2,32}\b/g;
const MAILTO_TEL_RE = /\b(?:mailto|tel):[^\s)]+/gi;
/** Lines that look like social profile URLs — drop entire line. */
const PROFILE_URL_LINE_RE =
  /https?:\/\/(?:www\.)?(?:facebook|instagram|twitter|x)\.com\/(?:share|people|groups)?\/?[^\s]*/gi;

const LONG_QUOTE_RE = /"[^"]{81,}"/g;
const BLOCKQUOTE_LINE_RE = /^>\s*.+$/gm;

/** “Posted by …” style blocks — remove line. */
const POSTED_BY_RE = /^.{0,40}posted\s+by\s+.+$/gim;

/**
 * Strip HTML to plain text (no DOM); removes script/style/svg content first.
 */
export function htmlToPlainText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  s = decodeBasicEntities(s);
  return s.replace(/\s+/g, " ").trim();
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Redact PII-ish patterns and drop risky lines. Returns lowercase text for matching.
 */
export function redactForMining(plainText: string): string {
  let t = plainText;

  t = t.replace(EMAIL_RE, " ");
  t = t.replace(PHONE_RE, " ");
  t = t.replace(HANDLE_RE, " ");
  t = t.replace(MAILTO_TEL_RE, " ");
  t = t.replace(LONG_QUOTE_RE, " ");
  t = t.replace(BLOCKQUOTE_LINE_RE, " ");
  t = t.replace(POSTED_BY_RE, " ");

  const lines = t.split(/\n+/);
  const kept: string[] = [];
  for (const line of lines) {
    if (PROFILE_URL_LINE_RE.test(line)) {
      PROFILE_URL_LINE_RE.lastIndex = 0;
      continue;
    }
    PROFILE_URL_LINE_RE.lastIndex = 0;
    let L = line.replace(PROFILE_URL_LINE_RE, " ");
    L = L.replace(EMAIL_RE, " ").replace(PHONE_RE, " ").replace(HANDLE_RE, " ");
    if (L.trim().length > 200) {
      L = `${L.slice(0, 200)}`;
    }
    if (L.trim()) kept.push(L);
  }

  return kept.join("\n").toLowerCase().replace(/\s+/g, " ").trim();
}
