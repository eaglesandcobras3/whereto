/**
 * Map Google Search Console URL Inspection coverage/indexing fields to a boolean.
 *
 * Indexed when coverage indicates the URL is on Google (Submitted/Indexed or similar).
 * Explicitly not indexed for excluded / crawled-not-indexed / discovered-not-indexed / etc.
 */

export type GscIndexVerdict = {
  indexed: boolean | null;
  coverageState: string | null;
};

const INDEXED_STATES = new Set([
  "submitted and indexed",
  "indexed",
  "url is on google",
  "url is on google: indexed",
]);

const NOT_INDEXED_STATES = new Set([
  "url is unknown to google",
  "url is not on google",
  "crawled - currently not indexed",
  "discovered - currently not indexed",
  "excluded",
  "excluded by 'noindex' tag",
  "blocked by robots.txt",
  "not found (404)",
  "page with redirect",
  "soft 404",
  "duplicate without user-selected canonical",
  "duplicate, google chose different canonical than user",
  "alternate page with proper canonical tag",
  "server error (5xx)",
  "access denied",
]);

export function mapCoverageToIndexed(
  coverageState: string | null | undefined,
  indexingState?: string | null,
): GscIndexVerdict {
  const coverage = (coverageState ?? "").trim();
  const indexing = (indexingState ?? "").trim();
  const combined = `${coverage} ${indexing}`.toLowerCase();

  if (!coverage && !indexing) {
    return { indexed: null, coverageState: coverageState ?? null };
  }

  const coverageLower = coverage.toLowerCase();
  if (INDEXED_STATES.has(coverageLower) || combined.includes("submitted and indexed")) {
    return { indexed: true, coverageState: coverageState ?? indexingState ?? null };
  }
  if (combined.includes("indexed") && !combined.includes("not indexed")) {
    return { indexed: true, coverageState: coverageState ?? indexingState ?? null };
  }

  if (
    NOT_INDEXED_STATES.has(coverageLower) ||
    combined.includes("not indexed") ||
    combined.includes("excluded") ||
    combined.includes("unknown to google")
  ) {
    return { indexed: false, coverageState: coverageState ?? indexingState ?? null };
  }

  // indexingState enum from API: INDEXING_ALLOWED / BLOCKED_*, etc.
  if (indexing.toUpperCase().includes("INDEXING_ALLOWED") && coverageLower.includes("indexed")) {
    return { indexed: true, coverageState: coverageState ?? null };
  }

  return { indexed: null, coverageState: coverageState ?? indexingState ?? null };
}
