"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { StageCard } from "@/components/ask/inspect/StageCard";
import { BusinessResultCard } from "@/components/ask/BusinessResultCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { BusinessResultCard as CardModel } from "@/lib/ask/types";
import { Search, AlertCircle, CheckCircle2, XCircle, AlertTriangle, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildInspectDebugReport } from "@/lib/ask/inspect-report";
import { composeClarificationSearchQuery } from "@/lib/ask/clarifying-query";
import { extractTownFromText } from "@/lib/ask/search-input";

// ---------------------------------------------------------------------------
// API result types
// ---------------------------------------------------------------------------

type AnalyzeResult = {
  rawQuery: string;
  normalizedQuery: string;
  themes: Record<string, boolean>;
  detectedThemes: string[];
  enrichmentsApplied: string[];
  reasoning: string;
  ambient: { weather: string; timeOfDay: string; season: string; crowdLevel: string } | null;
};

type ClarifyResult = {
  questions: Array<{ id: string; question: string; suggestions?: string[] }>;
  questionReasons: Array<{ id: string; question: string; reason: string }>;
  skippedQuestions: Array<{ id: string; question: string; reason: string }>;
  questionMeta: Array<{ id: string; source: "hard_rule" | "llm_selected" }>;
  llmRequestedIds: string[];
  hardRuleIds: string[];
  questionBankNote: string;
  reasoning: string;
  wouldAsk: boolean;
};

type CapabilityGap = {
  type: "menu_item";
  items: string[];
  message: string;
  continueMessage: string;
};

type PlanResult = {
  intent: Record<string, unknown>;
  intentSource?: string;
  searchFacets?: {
    active: string[];
    planComplete?: boolean;
    explicitTreat?: string | null;
    constraints?: {
      townOrArea?: string | null;
      mealPeriod?: string | null;
      dietaryNeeds?: string[];
      vibeTags?: string[];
    };
  };
  intentSummary: string;
  strategies: Array<{
    id: string;
    label: string;
    matchHint: string;
    categorySlug: string | null;
    vibeTags?: string[];
    scopeOverride: string | null;
    sortMode: string | null;
    weight: number;
  }>;
  isSimple: boolean;
  strategyCount: number;
  reasoning: string;
  capabilityGap: CapabilityGap | null;
};

type RawStrategyResult = {
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

type SearchResult = {
  attempts: Array<{ label: string; strategyId: string; resultCount: number; wave: 1 | 2 }>;
  wave2Triggered: boolean;
  wave1Hits: number;
  totalResults: number;
  rankedCards: CardModel[];
  reviewNotes: Array<{ rank: number; title: string; score: number; strategies: string[]; why: string }>;
  searchSummary: string;
  progressEvents: Array<{ stage: string; message: string }>;
  pipelineSteps: Array<{ step: number; name: string; detail: string }>;
  reasoning: string;
  composedQuery: string;
  searchKeywords: string;
  rawStrategyResults: RawStrategyResult[];
  constrainTownId: string | null;
  constrainTownLabel?: string | null;
  resolvedFilters: Record<string, unknown> | null;
  zeroResultHints: string[];
};

type ValidateResult = {
  score: number;
  isGood: boolean;
  reasoning: string;
  suggestions: string | null;
  alternativeAnswer: string | null;
  promptSent: string;
};

type LogResult = {
  loggedId: string;
};

// ---------------------------------------------------------------------------
// Flow state
// ---------------------------------------------------------------------------

type StageState =
  | { status: "pending" }
  | { status: "running" }
  | { status: "awaiting"; data: unknown }
  | { status: "done"; data: unknown }
  | { status: "skipped" };

type FlowState = {
  query: string;
  analyze: StageState;
  clarify: StageState;
  plan: StageState;
  capabilityGapAcknowledged: boolean;
  search: StageState;
  validate: StageState;
  logFailure: StageState;
  error: string | null;
};

const INITIAL: FlowState = {
  query: "",
  analyze: { status: "pending" },
  clarify: { status: "pending" },
  plan: { status: "pending" },
  capabilityGapAcknowledged: false,
  search: { status: "pending" },
  validate: { status: "pending" },
  logFailure: { status: "pending" },
  error: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callStage<T>(stage: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/ask/inspect/${stage}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? `Stage ${stage} failed`);
  }
  return res.json() as Promise<T>;
}

function themeLabel(key: string): string {
  const labels: Record<string, string> = {
    coffee: "Coffee", treats: "Treats", bakery: "Bakery", dining: "Dining",
    kids: "Kid-friendly", bars: "Bars", activities: "Activities",
    shopping: "Shopping", iceCream: "Ice cream", donuts: "Donuts",
  };
  return labels[key] ?? key;
}

function scoreColor(score: number) {
  if (score >= 8) return "text-emerald-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InspectFlow() {
  const [flow, setFlow] = useState<FlowState>(INITIAL);
  const [inputValue, setInputValue] = useState("");
  const [clarifySelections, setClarifySelections] = useState<Record<string, string>>({});
  const [copyOk, setCopyOk] = useState(false);
  const autoAdvanceRef = useRef({ plan: false, clarify: false, search: false });

  // ---- Stage setters ----

  const setStage = useCallback(
    (key: keyof Pick<FlowState, "analyze" | "clarify" | "plan" | "search" | "validate" | "logFailure">, state: StageState, error?: string) => {
      setFlow((prev) => ({ ...prev, [key]: state, error: error ?? null }));
    },
    [],
  );

  // ---- Stage runners ----

  const runAnalyze = useCallback(async (query: string) => {
    setClarifySelections({});
    autoAdvanceRef.current = { plan: false, clarify: false, search: false };
    setFlow({ ...INITIAL, query, analyze: { status: "running" } });
    try {
      const data = await callStage<AnalyzeResult>("analyze", { query });
      setFlow((prev) => ({ ...prev, analyze: { status: "done", data }, clarify: { status: "pending" } }));
    } catch (e) {
      setFlow((prev) => ({ ...prev, analyze: { status: "pending" }, error: (e as Error).message }));
    }
  }, []);

  const runClarify = useCallback(async () => {
    const analyzeData = flow.analyze.status === "done" ? (flow.analyze.data as AnalyzeResult) : null;
    if (!analyzeData) return;
    setStage("clarify", { status: "running" });
    try {
      const data = await callStage<ClarifyResult>("clarify", { rawQuery: analyzeData.rawQuery });
      // "awaiting" = questions loaded, waiting for user to answer
      setStage("clarify", { status: "awaiting", data });
    } catch (e) {
      setStage("clarify", { status: "pending" }, (e as Error).message);
    }
  }, [flow.analyze, setStage]);

  const confirmClarify = useCallback(() => {
    const clarifyData = flow.clarify.status === "awaiting" ? (flow.clarify.data as ClarifyResult) : null;
    if (!clarifyData) return;
    setStage("clarify", { status: "done", data: clarifyData });
  }, [flow.clarify, setStage]);

  const skipClarify = useCallback(() => {
    setStage("clarify", { status: "skipped" });
  }, [setStage]);

  const inspectClarifyContext = useCallback(
    (originalQuery: string) => {
      const clarifyAnswers = Object.values(clarifySelections).filter(Boolean).join(". ");
      const verbatimQuery = clarifyAnswers
        ? composeClarificationSearchQuery(originalQuery, clarifyAnswers)
        : originalQuery;
      const townOrArea =
        clarifySelections.location?.trim() ||
        extractTownFromText(`${originalQuery} ${clarifyAnswers}`);
      return { clarifyAnswers: clarifyAnswers || undefined, verbatimQuery, townOrArea };
    },
    [clarifySelections],
  );

  const runPlan = useCallback(async () => {
    const analyzeData = flow.analyze.status === "done" ? (flow.analyze.data as AnalyzeResult) : null;
    if (!analyzeData) return;
    const { clarifyAnswers, townOrArea } = inspectClarifyContext(flow.query);
    setStage("plan", { status: "running" });
    try {
      const data = await callStage<PlanResult>("plan", {
        rawQuery: flow.query,
        townOrArea,
        clarifyAnswers,
      });
      setStage("plan", { status: "awaiting", data });
    } catch (e) {
      setStage("plan", { status: "pending" }, (e as Error).message);
    }
  }, [flow.analyze, flow.query, inspectClarifyContext, setStage]);

  const confirmPlan = useCallback(() => {
    const planData = flow.plan.status === "awaiting" ? (flow.plan.data as PlanResult) : null;
    if (!planData) return;
    setStage("plan", { status: "done", data: planData });
  }, [flow.plan, setStage]);

  const acknowledgeCapabilityGap = useCallback(() => {
    setFlow((prev) => ({ ...prev, capabilityGapAcknowledged: true }));
  }, []);

  const runSearch = useCallback(async () => {
    const analyzeData = flow.analyze.status === "done" ? (flow.analyze.data as AnalyzeResult) : null;
    if (!analyzeData) return;

    // Compose clarify answers into the query
    const clarifyData =
      flow.clarify.status === "done" ? (flow.clarify.data as ClarifyResult) : null;
    const { clarifyAnswers, verbatimQuery, townOrArea } = inspectClarifyContext(flow.query);

    setStage("search", { status: "running" });
    try {
      const data = await callStage<SearchResult>("search", {
        rawQuery: flow.query,
        clarifyAnswers,
        townOrArea,
      });
      setStage("search", { status: "done", data });
    } catch (e) {
      setStage("search", { status: "pending" }, (e as Error).message);
    }
  }, [flow.analyze, flow.clarify, flow.query, inspectClarifyContext, setStage]);

  const runValidate = useCallback(async () => {
    const searchData = flow.search.status === "done" ? (flow.search.data as SearchResult) : null;
    if (!searchData) return;
    setStage("validate", { status: "running" });
    try {
      const top5 = searchData.rankedCards.slice(0, 5).map((c) => ({
        title: c.title,
        category: c.category,
        town: c.town_or_area,
        match_reason: c.match_reason ?? null,
      }));
      const data = await callStage<ValidateResult>("validate", {
        query: flow.query,
        composedQuery: searchData.composedQuery,
        townConstraint: searchData.constrainTownLabel ?? null,
        results: top5,
      });
      setStage("validate", { status: "done", data });
    } catch (e) {
      setStage("validate", { status: "pending" }, (e as Error).message);
    }
  }, [flow.search, flow.query, setStage]);

  const skipValidate = useCallback(() => setStage("validate", { status: "skipped" }), [setStage]);

  const runLogFailure = useCallback(async () => {
    const validateData = flow.validate.status === "done" ? (flow.validate.data as ValidateResult) : null;
    const searchData = flow.search.status === "done" ? (flow.search.data as SearchResult) : null;
    if (!validateData || !searchData) return;
    setStage("logFailure", { status: "running" });
    try {
      const results = searchData.rankedCards.slice(0, 5).map((c) => ({
        title: c.title, category: c.category, town: c.town_or_area,
      }));
      const data = await callStage<LogResult>("log-failure", {
        query: searchData.composedQuery || flow.query,
        results,
        validationScore: validateData.score,
        validationReason: validateData.reasoning,
        validationSuggestions: validateData.suggestions,
      });
      setStage("logFailure", { status: "done", data });
    } catch (e) {
      setStage("logFailure", { status: "pending" }, (e as Error).message);
    }
  }, [flow.validate, flow.search, flow.query, setStage]);

  // ---- Data shortcuts ----

  const analyzeData = flow.analyze.status === "done" ? (flow.analyze.data as AnalyzeResult) : null;
  const clarifyData =
    flow.clarify.status === "awaiting" || flow.clarify.status === "done"
      ? (flow.clarify.data as ClarifyResult)
      : null;
  const planData = (flow.plan.status === "done" || flow.plan.status === "awaiting") ? (flow.plan.data as PlanResult) : null;
  const searchData = flow.search.status === "done" ? (flow.search.data as SearchResult) : null;
  const validateData = flow.validate.status === "done" ? (flow.validate.data as ValidateResult) : null;
  const logData = flow.logFailure.status === "done" ? (flow.logFailure.data as LogResult) : null;

  const capabilityGap = planData?.capabilityGap ?? null;
  const needsCapabilityAck = !!capabilityGap && !flow.capabilityGapAcknowledged;

  // ---- Visibility gates (order: analyze → plan → clarify → search) ----
  const isPlanVisible = flow.analyze.status === "done";
  const isClarifyVisible =
    isPlanVisible &&
    (flow.plan.status === "done" ||
      flow.clarify.status === "running" ||
      flow.clarify.status === "awaiting" ||
      flow.clarify.status === "done" ||
      flow.clarify.status === "skipped");
  const isSearchVisible =
    flow.plan.status === "done" &&
    (flow.clarify.status === "done" || flow.clarify.status === "skipped") &&
    !needsCapabilityAck;
  const isValidateVisible = isSearchVisible && flow.search.status === "done";
  const isLogVisible =
    isValidateVisible && flow.validate.status === "done" && validateData != null && !validateData.isGood;

  const finalResults = searchData?.rankedCards ?? [];
  const showFinalResults = flow.search.status === "done";

  // Auto-advance: analyze → plan → (pause) → clarify → search → (pause)
  useEffect(() => {
    if (flow.analyze.status !== "done" || flow.plan.status !== "pending") return;
    if (autoAdvanceRef.current.plan) return;
    autoAdvanceRef.current.plan = true;
    void runPlan();
  }, [flow.analyze.status, flow.plan.status, runPlan]);

  useEffect(() => {
    if (flow.plan.status !== "done" || flow.clarify.status !== "pending") return;
    if (autoAdvanceRef.current.clarify) return;
    autoAdvanceRef.current.clarify = true;
    void runClarify();
  }, [flow.plan.status, flow.clarify.status, runClarify]);

  useEffect(() => {
    if (needsCapabilityAck) return;
    if (flow.plan.status !== "done") return;
    if (flow.clarify.status !== "done" && flow.clarify.status !== "skipped") return;
    if (flow.search.status !== "pending") return;
    if (autoAdvanceRef.current.search) return;
    autoAdvanceRef.current.search = true;
    void runSearch();
  }, [
    flow.plan.status,
    flow.clarify.status,
    flow.search.status,
    needsCapabilityAck,
    runSearch,
  ]);

  // ---- Clarify button label ----
  const clarifyApproveLabel =
    flow.clarify.status === "awaiting"
      ? Object.keys(clarifySelections).length > 0
        ? "Continue to search"
        : "Search without answers"
      : null;

  const clarifyApproveHandler = confirmClarify;

  const clarifyAnswersText = Object.values(clarifySelections).filter(Boolean).join(". ");

  const copyDebugReport = useCallback(async () => {
    const report = buildInspectDebugReport({
      userQuery: flow.query,
      analyze: analyzeData
        ? {
            rawQuery: analyzeData.rawQuery,
            normalizedQuery: analyzeData.normalizedQuery,
            detectedThemes: analyzeData.detectedThemes,
            enrichmentsApplied: analyzeData.enrichmentsApplied,
            reasoning: analyzeData.reasoning,
          }
        : undefined,
      clarify: clarifyData
        ? {
            wouldAsk: clarifyData.wouldAsk,
            reasoning: clarifyData.reasoning,
            questionBankNote: clarifyData.questionBankNote,
            clarifyAnswers: clarifyAnswersText || undefined,
            questions: clarifyData.questions.map((q) => {
              const meta = clarifyData.questionMeta.find((m) => m.id === q.id);
              const reason = clarifyData.questionReasons.find((r) => r.id === q.id)?.reason;
              return {
                id: q.id,
                question: q.question,
                source: meta?.source === "hard_rule" ? "required rule" : "AI selected",
                reason,
              };
            }),
            skippedQuestions: clarifyData.skippedQuestions,
          }
        : undefined,
      plan: planData
        ? {
            intentSummary: planData.intentSummary,
            reasoning: planData.reasoning,
            strategies: planData.strategies.map((s) => ({
              id: s.id,
              label: s.label,
              categorySlug: s.categorySlug,
              matchHint: s.matchHint,
            })),
            capabilityGap: planData.capabilityGap,
          }
        : undefined,
      search: searchData
        ? {
            searchKeywords: searchData.searchKeywords,
            composedQuery: searchData.composedQuery,
            constrainTownId: searchData.constrainTownId ?? undefined,
            reasoning: searchData.reasoning,
            attempts: searchData.attempts,
            strategyRuns: searchData.rawStrategyResults,
            reviewNotes: searchData.reviewNotes,
            totalResults: searchData.totalResults,
            zeroResultHints: searchData.zeroResultHints,
          }
        : undefined,
      validate: validateData
        ? {
            score: validateData.score,
            isGood: validateData.isGood,
            reasoning: validateData.reasoning,
            suggestions: validateData.suggestions,
          }
        : undefined,
    });
    await navigator.clipboard.writeText(report);
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 2000);
  }, [
    flow.query,
    analyzeData,
    clarifyData,
    clarifyAnswersText,
    planData,
    searchData,
    validateData,
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8 px-4">
      {/* Query input */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Search Inspector</h1>
        <p className="text-sm text-muted-foreground">
          Step-by-step pipeline: themes, clarifying questions (why asked / skipped), each search strategy&apos;s query and hits,
          merge + ranking, and a copy-paste debug report for zero-result fixes.
        </p>
        {flow.analyze.status !== "pending" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void copyDebugReport()}
          >
            {copyOk ? (
              <>
                <Check className="mr-1.5 size-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 size-3.5" />
                Copy debug report
              </>
            )}
          </Button>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputValue.trim()) runAnalyze(inputValue.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. coffee in rosemary beach, ice cream with kids"
            className="rounded-full"
          />
          <Button type="submit" size="icon" className="shrink-0 rounded-full">
            <Search className="size-4" />
          </Button>
        </form>
      </div>

      {flow.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {flow.error}
        </div>
      ) : null}

      {flow.analyze.status !== "pending" ? (
        <div className="space-y-3">

          {/* Stage 1: Analyze */}
          <StageCard
            index={1}
            heading="Reading your question"
            persistContent
            status={flow.analyze.status === "done" ? "done" : flow.analyze.status === "running" ? "running" : "pending"}
            summary={
              analyzeData
                ? analyzeData.detectedThemes.length
                  ? `${analyzeData.detectedThemes.map(themeLabel).join(", ")} detected`
                  : "No specific themes — broad search"
                : undefined
            }
          >
            {flow.analyze.status === "running" && (
              <p className="text-sm text-muted-foreground">Analyzing your query…</p>
            )}
            {analyzeData && <AnalyzePanel data={analyzeData} />}
          </StageCard>

          {/* Stage 2: Plan (intent + strategies) */}
          {isPlanVisible && (
            <StageCard
              index={2}
              heading="How I'll search for this"
              persistContent
              status={
                flow.plan.status === "done" ? "done"
                : flow.plan.status === "skipped" ? "skipped"
                : flow.plan.status === "awaiting" ? "awaiting"
                : flow.plan.status === "running" ? "running"
                : "pending"
              }
              summary={
                flow.plan.status === "done" && planData
                  ? `${planData.strategyCount} search angle${planData.strategyCount !== 1 ? "s" : ""}${planData.capabilityGap ? " · ⚠ limitation detected" : ""}`
                  : flow.plan.status === "awaiting" && planData
                  ? `${planData.strategyCount} angle${planData.strategyCount !== 1 ? "s" : ""} ready — review, then continue`
                  : undefined
              }
              approveLabel={
                flow.plan.status === "awaiting" ? "Continue to clarifying questions"
                : null
              }
              onApprove={flow.plan.status === "awaiting" ? confirmPlan : undefined}
            >
              {flow.plan.status === "running" && (
                <p className="text-sm text-muted-foreground">Resolving intent and planning search angles…</p>
              )}
              {planData && <PlanPanel data={planData} />}
            </StageCard>
          )}

          {/* Stage 3: Clarify */}
          {isClarifyVisible && (
            <StageCard
              index={3}
              heading="Would I ask you anything first?"
              persistContent
              status={
                flow.clarify.status === "done" || flow.clarify.status === "skipped"
                  ? flow.clarify.status
                  : flow.clarify.status === "awaiting"
                  ? "awaiting"
                  : flow.clarify.status === "running"
                  ? "running"
                  : "pending"
              }
              summary={
                flow.clarify.status === "done" && clarifyData
                  ? clarifyData.wouldAsk
                    ? `Would ask: ${clarifyData.questions.map((q) => q.question).join("; ")}${Object.keys(clarifySelections).length ? ` — you answered ${Object.keys(clarifySelections).length} question(s)` : ""}`
                    : "No clarifying questions needed"
                  : flow.clarify.status === "skipped"
                  ? "Skipped"
                  : undefined
              }
              approveLabel={clarifyApproveLabel}
              skipLabel={flow.clarify.status === "awaiting" ? "Skip clarifying" : undefined}
              onApprove={clarifyApproveHandler}
              onSkip={skipClarify}
            >
              {flow.clarify.status === "running" && (
                <p className="text-sm text-muted-foreground">Deciding what (if anything) to ask…</p>
              )}
              {clarifyData && (
                <ClarifyPanel
                  data={clarifyData}
                  selections={clarifySelections}
                  onSelect={(questionId, answer) =>
                    setClarifySelections((prev) =>
                      prev[questionId] === answer
                        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== questionId))
                        : { ...prev, [questionId]: answer },
                    )
                  }
                  isInteractive={flow.clarify.status === "awaiting"}
                />
              )}
            </StageCard>
          )}

          {/* Capability gap warning — shown between clarify and search */}
          {planData && capabilityGap && needsCapabilityAck && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-amber-900">We can't answer this exactly</p>
                    <p className="mt-1 text-sm text-amber-800">{capabilityGap.message}</p>
                  </div>
                  <p className="text-sm text-amber-700">
                    <span className="font-medium">If you want to continue:</span> {capabilityGap.continueMessage}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={acknowledgeCapabilityGap}
                    >
                      Find those places anyway
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-amber-800"
                      onClick={() => {
                        setInputValue("");
                        setFlow(INITIAL);
                      }}
                    >
                      Let me rephrase
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage 4: Search (runs automatically after clarify) */}
          {isSearchVisible && (
            <StageCard
              index={4}
              heading={flow.search.status === "running" ? "Searching…" : "Search results"}
              persistContent
              status={
                flow.search.status === "done" ? "done"
                : flow.search.status === "running" ? "running"
                : "pending"
              }
              summary={
                searchData
                  ? `${searchData.totalResults} places found${searchData.wave2Triggered ? " (expanded)" : ""}`
                  : undefined
              }
            >
              {flow.search.status === "running" && (
                <p className="text-sm text-muted-foreground">Running across all search angles…</p>
              )}
              {searchData && <SearchPanel data={searchData} />}
            </StageCard>
          )}

          {/* Stage 5: Validate */}
          {isValidateVisible && (
            <StageCard
              index={5}
              heading="Get a second opinion"
              persistContent
              status={
                flow.validate.status === "done" ? "done"
                : flow.validate.status === "skipped" ? "skipped"
                : flow.validate.status === "running" ? "running"
                : "pending"
              }
              summary={
                validateData
                  ? `Score: ${validateData.score}/10 — ${validateData.isGood ? "results look good" : "mismatch flagged"}`
                  : flow.validate.status === "skipped"
                  ? "Skipped"
                  : undefined
              }
              approveLabel={flow.validate.status === "pending" ? "Ask OpenAI to review" : null}
              skipLabel={flow.validate.status === "pending" ? "Skip and show results" : null}
              onApprove={runValidate}
              onSkip={skipValidate}
            >
              {flow.validate.status === "pending" && searchData && (
                <ValidatePreview
                  originalQuery={flow.query}
                  composedQuery={searchData.composedQuery}
                  townConstraint={searchData.constrainTownLabel}
                  cards={searchData.rankedCards.slice(0, 5)}
                />
              )}
              {flow.validate.status === "running" && (
                <p className="text-sm text-muted-foreground">Asking OpenAI to evaluate the top 5 results…</p>
              )}
              {validateData && <ValidatePanel data={validateData} />}
            </StageCard>
          )}

          {/* Stage 6: Log failure */}
          {isLogVisible && (
            <StageCard
              index={6}
              heading="Log this quality gap"
              status={
                flow.logFailure.status === "done" ? "done"
                : flow.logFailure.status === "skipped" ? "skipped"
                : flow.logFailure.status === "running" ? "running"
                : "pending"
              }
              summary={
                logData ? `Logged (ID: ${logData.loggedId.slice(0, 8)}…)` : undefined
              }
              approveLabel={flow.logFailure.status === "pending" ? "Log and show results" : null}
              skipLabel={flow.logFailure.status === "pending" ? "Skip logging" : null}
              onApprove={runLogFailure}
              onSkip={() => setStage("logFailure", { status: "skipped" })}
            >
              {flow.logFailure.status === "pending" && validateData && (
                <LogFailurePreview validateData={validateData} />
              )}
              {flow.logFailure.status === "running" && (
                <p className="text-sm text-muted-foreground">Logging to quality queue…</p>
              )}
              {logData && (
                <p className="text-sm text-muted-foreground">
                  Saved. The gap will be reviewed so the search can improve.
                </p>
              )}
            </StageCard>
          )}

          {/* Zero results diagnostic */}
          {showFinalResults && finalResults.length === 0 && searchData && (
            <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5">
              <h2 className="font-semibold text-red-900">Zero results — debug checklist</h2>
              <p className="text-sm text-red-800">
                Composed query: <span className="font-mono">"{searchData.composedQuery}"</span>
                {searchData.constrainTownId ? (
                  <> · town filter: <span className="font-mono">{searchData.constrainTownId}</span></>
                ) : (
                  <> · no town filter resolved</>
                )}
              </p>
              {searchData.zeroResultHints.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-sm text-red-800">
                  {searchData.zeroResultHints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              )}
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void copyDebugReport()}>
                <Copy className="mr-1.5 size-3.5" />
                Copy full report for fixing
              </Button>
            </div>
          )}

          {/* Final results */}
          {showFinalResults && finalResults.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                {validateData?.isGood ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : validateData && !validateData.isGood ? (
                  <AlertCircle className="size-4 text-amber-600" />
                ) : null}
                <h2 className="font-semibold">
                  {validateData?.isGood
                    ? "Results validated"
                    : validateData && !validateData.isGood
                    ? "Best available results"
                    : "Results"}
                </h2>
              </div>

              {capabilityGap && flow.capabilityGapAcknowledged && (
                <p className="text-sm text-amber-700">
                  ⚠ We can't confirm "{capabilityGap.items[0]}" specifically — call ahead to check.
                </p>
              )}

              {validateData && !validateData.isGood && (
                <p className="text-sm text-muted-foreground">
                  OpenAI flagged a quality gap. These are the best matches we have right now.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {finalResults.map((card) => (
                  <BusinessResultCard key={card.id} card={card} />
                ))}
              </div>

              {validateData && !validateData.isGood && validateData.alternativeAnswer && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="mb-1 font-medium text-amber-900">What OpenAI would expect instead</p>
                  <p className="text-amber-800">{validateData.alternativeAnswer}</p>
                </div>
              )}
            </div>
          )}

        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

function Reasoning({ text }: { text: string }) {
  return (
    <div className="rounded-lg bg-primary/5 px-3 py-2.5 text-sm text-foreground/80">
      <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide text-primary/70">Why</span>
      {text}
    </div>
  );
}

function AnalyzePanel({ data }: { data: AnalyzeResult }) {
  return (
    <div className="space-y-3 text-sm">
      <Reasoning text={data.reasoning} />

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Query I'll search</p>
        <p className="font-mono text-foreground">"{data.rawQuery}"</p>
        {data.rawQuery !== data.normalizedQuery && (
          <p className="text-xs text-muted-foreground">Normalized: {data.normalizedQuery}</p>
        )}
      </div>

      {data.detectedThemes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Themes detected</p>
          <div className="flex flex-wrap gap-1.5">
            {data.detectedThemes.map((t) => (
              <Badge key={t} variant="secondary" className="rounded-full">
                {themeLabel(t)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {data.enrichmentsApplied.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Real-time adjustments</p>
          <ul className="space-y-0.5 text-muted-foreground">
            {data.enrichmentsApplied.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/40" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.ambient && (
        <p className="text-xs text-muted-foreground">
          30A right now: {data.ambient.weather} · {data.ambient.timeOfDay} · {data.ambient.season}
        </p>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: "hard_rule" | "llm_selected" }) {
  return (
    <Badge
      variant={source === "hard_rule" ? "default" : "secondary"}
      className="ml-2 rounded-full text-[10px] font-normal"
    >
      {source === "hard_rule" ? "Required" : "AI picked"}
    </Badge>
  );
}

function ClarifyPanel({
  data,
  selections,
  onSelect,
  isInteractive,
}: {
  data: ClarifyResult;
  selections: Record<string, string>;
  onSelect: (questionId: string, answer: string) => void;
  isInteractive: boolean;
}) {
  const metaById = Object.fromEntries(data.questionMeta.map((m) => [m.id, m.source]));

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">{data.questionBankNote}</p>
      {data.llmRequestedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          AI requested IDs: <span className="font-mono">{data.llmRequestedIds.join(", ")}</span>
          {data.hardRuleIds.length > 0 && (
            <> · Required: <span className="font-mono">{data.hardRuleIds.join(", ")}</span></>
          )}
        </p>
      )}
      <Reasoning text={data.reasoning} />

      {!data.wouldAsk ? (
        <p className="text-muted-foreground">No questions needed — enough context to go straight to search.</p>
      ) : (
        <div className="space-y-4">
          {data.questions.map((q) => {
            const qReason = data.questionReasons.find((r) => r.id === q.id);
            const selected = selections[q.id];
            const source = metaById[q.id];
            return (
              <div key={q.id} className="space-y-2 rounded-lg border bg-muted/20 px-3 py-2.5">
                <div>
                  <p className="font-medium text-foreground">
                    {q.question}
                    {source ? <SourceBadge source={source} /> : null}
                  </p>
                  {qReason && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/70">Why ask:</span> {qReason.reason}
                    </p>
                  )}
                </div>
                {q.suggestions && (
                  <div className="flex flex-wrap gap-1.5">
                    {q.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={!isInteractive}
                        onClick={() => isInteractive && onSelect(q.id, s)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          selected === s
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-muted",
                          !isInteractive && "cursor-default opacity-60",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {selected && (
                  <p className="text-xs text-primary">Selected: {selected}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data.skippedQuestions.length > 0 && (
        <details className="rounded-lg border border-dashed bg-muted/10 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Skipped questions ({data.skippedQuestions.length}) — why not asked
          </summary>
          <ul className="mt-2 space-y-2">
            {data.skippedQuestions.map((q) => (
              <li key={q.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{q.question}</span>
                <span className="font-mono text-[10px]"> ({q.id})</span>
                <p className="mt-0.5">{q.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function PlanPanel({ data }: { data: PlanResult }) {
  return (
    <div className="space-y-4 text-sm">
      <Reasoning text={data.reasoning} />

      {data.intentSummary && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What I understood</p>
          <p className="text-muted-foreground">{data.intentSummary}</p>
        </div>
      )}

      {data.intentSource && (
        <p className="text-xs text-muted-foreground">
          Intent source: <span className="font-mono">{data.intentSource}</span>
          {data.searchFacets?.planComplete != null && (
            <> · facet plan {data.searchFacets.planComplete ? "complete" : "incomplete"}</>
          )}
        </p>
      )}

      {data.searchFacets?.constraints && (
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Facet constraints</p>
          <p>
            Town: {data.searchFacets.constraints.townOrArea ?? "—"}
            {data.searchFacets.constraints.mealPeriod
              ? ` · Meal: ${data.searchFacets.constraints.mealPeriod}`
              : ""}
            {data.searchFacets.constraints.dietaryNeeds?.length
              ? ` · Dietary: ${data.searchFacets.constraints.dietaryNeeds.join(", ")}`
              : ""}
            {data.searchFacets.constraints.vibeTags?.length
              ? ` · Vibes: ${data.searchFacets.constraints.vibeTags.join(", ")}`
              : ""}
          </p>
          {data.searchFacets.active?.length ? (
            <p className="mt-1">Active facets: {data.searchFacets.active.join(", ")}</p>
          ) : null}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {data.isSimple
            ? "1 search strategy"
            : `${data.strategyCount} search strategies — running in parallel`}
        </p>
        {data.strategies.map((s, i) => (
          <div key={s.id} className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <p className="font-semibold text-foreground">{s.label}</p>
              {s.scopeOverride === "near" && (
                <Badge variant="outline" className="ml-auto shrink-0 text-xs">expands to nearby towns</Badge>
              )}
            </div>
            <p className="ml-7 mt-0.5 text-xs text-muted-foreground">
              Category: <span className="font-mono">{s.categorySlug ?? "any"}</span>
              {s.vibeTags?.length ? ` · vibes: ${s.vibeTags.join(", ")}` : ""}
              {s.sortMode ? ` · sorted by: ${s.sortMode}` : ""}
            </p>
            <p className="ml-7 mt-0.5 text-xs text-muted-foreground">{s.matchHint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchPanel({ data }: { data: SearchResult }) {
  return (
    <div className="space-y-4 text-sm">
      <Reasoning text={data.reasoning} />

      {data.pipelineSteps?.length > 0 && (
        <ol className="space-y-1.5 rounded-lg border bg-muted/20 px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline</p>
          {data.pipelineSteps.map((s) => (
            <li key={s.step} className="text-xs">
              <span className="font-mono text-muted-foreground">{s.step}.</span>{" "}
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground"> — {s.detail}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <span className="font-semibold text-muted-foreground">Keywords extracted</span>
          <p className="font-mono text-foreground">"{data.searchKeywords}"</p>
        </div>
        <div>
          <span className="font-semibold text-muted-foreground">Composed query (sent to search)</span>
          <p className="font-mono text-foreground">"{data.composedQuery}"</p>
        </div>
        {data.constrainTownLabel ? (
          <div>
            <span className="font-semibold text-muted-foreground">Town filter</span>
            <p className="text-foreground">{data.constrainTownLabel}</p>
          </div>
        ) : null}
        {data.constrainTownId ? (
          <div>
            <span className="font-semibold text-muted-foreground">Town ID</span>
            <p className="font-mono text-foreground">{data.constrainTownId}</p>
          </div>
        ) : null}
      </div>

      {data.resolvedFilters ? (
        <details className="rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resolved filters (JSON)
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/40 p-2 font-mono text-[10px]">
            {JSON.stringify(data.resolvedFilters, null, 2)}
          </pre>
        </details>
      ) : null}

      {data.progressEvents.length > 0 && (
        <details className="rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Progress events
          </summary>
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {data.progressEvents.map((e, i) => (
              <li key={i}>
                <span className="font-mono">[{e.stage}]</span> {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}

      {data.rawStrategyResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step 3 — Per-strategy search (before merge)
          </p>
          {data.rawStrategyResults.map((r) => (
            <div
              key={`${r.strategyId}-${r.wave}`}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                r.wave === 2 ? "border-amber-200 bg-amber-50" : "bg-muted/30",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {r.label}
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">{r.strategyId}</span>
                  {r.wave === 2 && <span className="ml-2 text-xs text-amber-700">Wave 2</span>}
                </p>
                <span className={cn("font-mono text-xs", r.resultCount === 0 ? "font-semibold text-red-600" : "text-muted-foreground")}>
                  {r.resultCount} results
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">query: "{r.searchQuery}"</p>
              <p className="text-[11px] text-muted-foreground">
                category: <span className="font-mono">{r.categorySlug ?? "any"}</span>
                {r.scopeOverride ? <> · scope: <span className="font-mono">{r.scopeOverride}</span></> : null}
                {r.sortMode ? <> · sort: <span className="font-mono">{r.sortMode}</span></> : null}
                {r.vibeTags?.length ? <> · vibes: {r.vibeTags.join(", ")}</> : null}
              </p>
              {(r.retrievalPath || r.rpcRowCount != null) && (
                <p className="text-[11px] text-muted-foreground">
                  retrieval: <span className="font-mono">{r.retrievalPath ?? "?"}</span>
                  {r.rpcRowCount != null && <> · rpc rows: {r.rpcRowCount}</>}
                </p>
              )}
              {r.resultCount > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {r.topHits.map((h, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                      <span>{i + 1}. {h.title}{h.category ? ` — ${h.category}` : ""}</span>
                      <span className="shrink-0 font-mono">
                        {h.composite != null ? `c:${h.composite.toFixed(3)}` : ""}
                        {h.vecSimilarity != null ? ` v:${h.vecSimilarity.toFixed(3)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-red-600">0 hits — contributed nothing to merge</p>
              )}
            </div>
          ))}
        </div>
      )}

      {data.reviewNotes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step 4 — After merge + ranking ({data.reviewNotes.length})
          </p>
          <div className="space-y-1.5">
            {data.reviewNotes.map((note) => (
              <div key={note.rank} className="rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">
                    #{note.rank} {note.title}
                    <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                      via {note.strategies.join(", ")}
                    </span>
                  </p>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{note.score.toFixed(3)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{note.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.totalResults === 0 && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
          <p className="font-semibold text-red-900">All strategies returned 0</p>
          {data.zeroResultHints.length > 0 ? (
            <ul className="list-inside list-disc space-y-0.5">
              {data.zeroResultHints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          ) : (
            <p>Use Copy debug report — check town match, category filters, and DB listings.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ValidatePreview({
  originalQuery,
  composedQuery,
  townConstraint,
  cards,
}: {
  originalQuery: string;
  composedQuery: string;
  townConstraint?: string | null;
  cards: CardModel[];
}) {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground space-y-2">
        <p>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full intent sent to OpenAI</span>
          <br />
          <span className="font-mono text-foreground">"{composedQuery}"</span>
        </p>
        {composedQuery !== originalQuery ? (
          <p className="text-xs">
            Original only: <span className="font-mono">"{originalQuery}"</span>
          </p>
        ) : null}
        {townConstraint ? (
          <p className="text-xs font-medium text-foreground">
            Location constraint: {townConstraint}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top 5 being evaluated</p>
        <ul className="space-y-0.5 text-muted-foreground">
          {cards.map((c, i) => (
            <li key={c.id} className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{i + 1}.</span>
              <span>{c.title}{c.category ? ` — ${c.category}` : ""}{c.town_or_area ? `, ${c.town_or_area}` : ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ValidatePanel({ data }: { data: ValidateResult }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-3">
        {data.isGood ? (
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="size-5 shrink-0 text-red-500" />
        )}
        <div>
          <span className={`text-2xl font-bold ${scoreColor(data.score)}`}>{data.score}</span>
          <span className="text-muted-foreground">/10</span>
          <span className="ml-2 text-muted-foreground text-sm">
            {data.isGood ? "— Results look good" : "— Mismatch flagged"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">OpenAI's reasoning</p>
        <p className="text-muted-foreground">{data.reasoning}</p>
      </div>

      {data.alternativeAnswer && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">What OpenAI would expect instead</p>
          <p className="text-amber-800">{data.alternativeAnswer}</p>
        </div>
      )}

      {data.suggestions && (
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">How to improve the search</p>
          <p className="text-muted-foreground">{data.suggestions}</p>
        </div>
      )}
    </div>
  );
}

function LogFailurePreview({ validateData }: { validateData: ValidateResult }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        This will be added to the quality issue queue so the team can investigate and improve this search.
      </p>
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
        <p><span className="font-medium">Score:</span> {validateData.score}/10</p>
        <p><span className="font-medium">Reason:</span> {validateData.reasoning}</p>
        {validateData.suggestions && (
          <p><span className="font-medium">Suggested fix:</span> {validateData.suggestions}</p>
        )}
      </div>
    </div>
  );
}
