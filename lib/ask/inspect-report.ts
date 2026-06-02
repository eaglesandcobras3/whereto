/**
 * Plain-text debug bundle for Search Inspector — copy/paste into issues or agent chats.
 */

export type InspectReportStrategyRun = {
  strategyId: string;
  label: string;
  wave: 1 | 2;
  resultCount: number;
  searchQuery: string;
  categorySlug: string | null;
  scopeOverride?: string | null;
  sortMode?: string | null;
  vibeTags?: string[];
  retrievalPath?: string;
  rpcRowCount?: number;
  resolvedTownId?: string;
  filterCategoryId?: string | null;
  topHits: Array<{ title: string; composite: number | null; vecSimilarity: number | null; category: string | null }>;
};

export type InspectReportInput = {
  userQuery: string;
  analyze?: {
    rawQuery: string;
    normalizedQuery: string;
    detectedThemes: string[];
    enrichmentsApplied: string[];
    reasoning: string;
  };
  clarify?: {
    wouldAsk: boolean;
    reasoning: string;
    questionBankNote?: string;
    questions: Array<{ id: string; question: string; source?: string; reason?: string }>;
    skippedQuestions: Array<{ id: string; question: string; reason: string }>;
    clarifyAnswers?: string;
  };
  plan?: {
    intentSummary: string;
    reasoning: string;
    strategies: Array<{ id: string; label: string; categorySlug: string | null; matchHint: string }>;
    capabilityGap?: { message: string } | null;
  };
  search?: {
    searchKeywords: string;
    composedQuery: string;
    constrainTownId?: string;
    reasoning: string;
    attempts: Array<{ label: string; strategyId: string; resultCount: number; wave: 1 | 2 }>;
    strategyRuns: InspectReportStrategyRun[];
    reviewNotes: Array<{ rank: number; title: string; score: number; strategies: string[]; why: string }>;
    totalResults: number;
    zeroResultHints?: string[];
  };
  validate?: {
    score: number;
    isGood: boolean;
    reasoning: string;
    suggestions: string | null;
  };
};

function section(title: string, body: string): string {
  return `\n## ${title}\n${body.trim()}\n`;
}

export function buildInspectDebugReport(input: InspectReportInput): string {
  const lines: string[] = [
    "# Ask Search Inspector — debug report",
    `Generated: ${new Date().toISOString()}`,
    `User query: "${input.userQuery}"`,
  ];

  if (input.analyze) {
    const a = input.analyze;
    lines.push(
      section(
        "1. Analyze",
        [
          `Raw: "${a.rawQuery}"`,
          `Normalized: ${a.normalizedQuery}`,
          `Themes: ${a.detectedThemes.length ? a.detectedThemes.join(", ") : "(none)"}`,
          a.enrichmentsApplied.length
            ? `Enrichments:\n${a.enrichmentsApplied.map((e) => `- ${e}`).join("\n")}`
            : "Enrichments: none",
          `Why: ${a.reasoning}`,
        ].join("\n"),
      ),
    );
  }

  if (input.clarify) {
    const c = input.clarify;
    const asked = c.questions.length
      ? c.questions
          .map(
            (q) =>
              `- [${q.source ?? "?"}] ${q.id}: "${q.question}"${q.reason ? `\n  Why ask: ${q.reason}` : ""}`,
          )
          .join("\n")
      : "(none — sufficient context)";
    const skipped = c.skippedQuestions.length
      ? c.skippedQuestions.map((q) => `- ${q.id}: "${q.question}" — ${q.reason}`).join("\n")
      : "(none)";
    lines.push(
      section(
        "2. Clarify",
        [
          c.questionBankNote ?? "Questions: curated bank; AI picks IDs.",
          `Would ask: ${c.wouldAsk}`,
          `Decision: ${c.reasoning}`,
          c.clarifyAnswers ? `User answers merged: "${c.clarifyAnswers}"` : "",
          `Asked:\n${asked}`,
          `Skipped:\n${skipped}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );
  }

  if (input.plan) {
    const p = input.plan;
    const strats = p.strategies
      .map((s) => `- ${s.label} (${s.id}) cat=${s.categorySlug ?? "any"} — ${s.matchHint}`)
      .join("\n");
    lines.push(
      section(
        "3. Plan",
        [
          p.intentSummary,
          `Why: ${p.reasoning}`,
          p.capabilityGap ? `Capability gap: ${p.capabilityGap.message}` : "",
          `Strategies:\n${strats}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );
  }

  if (input.search) {
    const s = input.search;
    const runs = s.strategyRuns
      .map((r) => {
        const hits =
          r.topHits.length > 0
            ? r.topHits
                .map(
                  (h, i) =>
                    `    ${i + 1}. ${h.title}${h.category ? ` (${h.category})` : ""} c=${h.composite?.toFixed(3) ?? "—"} v=${h.vecSimilarity?.toFixed(3) ?? "—"}`,
                )
                .join("\n")
            : "    (no hits)";
        return [
          `- [Wave ${r.wave}] ${r.label} (${r.strategyId}) → ${r.resultCount} results`,
          `    query: "${r.searchQuery}"`,
          `    category: ${r.categorySlug ?? "any"} | scope: ${r.scopeOverride ?? "default"} | sort: ${r.sortMode ?? "default"}`,
          r.vibeTags?.length ? `    vibes: ${r.vibeTags.join(", ")}` : "",
          r.retrievalPath ? `    retrieval: ${r.retrievalPath} (rpc rows: ${r.rpcRowCount ?? "?"})` : "",
          r.resolvedTownId ? `    town filter: ${r.resolvedTownId}` : "",
          r.filterCategoryId ? `    category filter id: ${r.filterCategoryId}` : "",
          `    top hits:\n${hits}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const ranked = s.reviewNotes.length
      ? s.reviewNotes
          .map(
            (n) =>
              `#${n.rank} ${n.title} (score ${n.score.toFixed(3)}) [${n.strategies.join(", ")}]\n  ${n.why}`,
          )
          .join("\n")
      : "(no ranked results)";

    lines.push(
      section(
        "4. Search",
        [
          `Keywords: "${s.searchKeywords}"`,
          `Composed query sent to engine: "${s.composedQuery}"`,
          s.constrainTownId ? `Town constraint id: ${s.constrainTownId}` : "Town constraint: (none / corridor-wide)",
          `Why: ${s.reasoning}`,
          `Attempts: ${s.attempts.map((a) => `${a.label}(${a.resultCount})`).join(", ") || "none"}`,
          `Total after merge: ${s.totalResults}`,
          `\nPer-strategy runs:\n${runs || "(none)"}`,
          `\nAfter merge + rank:\n${ranked}`,
          s.zeroResultHints?.length
            ? `\nZero-result hints:\n${s.zeroResultHints.map((h) => `- ${h}`).join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );
  }

  if (input.validate) {
    const v = input.validate;
    lines.push(
      section(
        "5. Validate (OpenAI)",
        [
          `Score: ${v.score}/10 — ${v.isGood ? "OK" : "MISMATCH"}`,
          `Reason: ${v.reasoning}`,
          v.suggestions ? `Suggestions: ${v.suggestions}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );
  }

  return lines.join("\n").trim() + "\n";
}

export function buildZeroResultHints(
  strategyRuns: InspectReportStrategyRun[],
  constrainTownId?: string,
): string[] {
  const hints: string[] = [];
  const allZero = strategyRuns.every((r) => r.resultCount === 0);

  if (allZero && strategyRuns.length > 0) {
    hints.push("Every strategy returned 0 rows — likely over-constrained filters or missing listings in DB.");
  }

  if (constrainTownId === undefined && strategyRuns.some((r) => r.resultCount === 0)) {
    hints.push("No town_id resolved — if user meant a specific town, clarify location or check towns table slug match.");
  }

  for (const r of strategyRuns) {
    if (r.resultCount === 0 && r.categorySlug) {
      hints.push(`Strategy "${r.label}" used category "${r.categorySlug}" with 0 hits — verify businesses exist in that category.`);
    }
    if (r.retrievalPath === "hybrid_strict" && r.rpcRowCount === 0) {
      hints.push(`"${r.label}": hybrid_strict returned 0 RPC rows for query "${r.searchQuery}".`);
    }
    if (r.retrievalPath === "ilike" && r.resultCount === 0) {
      hints.push(`"${r.label}": fell back to ILIKE text search and still found nothing.`);
    }
  }

  return [...new Set(hints)];
}
