import "server-only";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, streamText, type ModelMessage } from "ai";
import { ASK_SYSTEM_PROMPT } from "@/lib/ask/systemPrompt";
import { createAskTools, type AskToolContext } from "@/lib/ask/tools";
import {
  appendMessage,
  ensureConversation,
  loadArtifactSession,
  loadConversationMessages,
  logConversationEvent,
  saveArtifactSession,
} from "@/lib/ask/conversation-store";
import { formatForWeb, formatForSms, compressArtifactForChannel } from "@/lib/ask/channelAdapters";
import { generateArtifactSummary } from "@/lib/ask/shareArtifacts";
import {
  classifyRefinementIntent,
  isSearchResultsArtifact,
  refineSearch,
  resultCountFromArtifact,
  searchToolForArtifact,
} from "@/lib/ask/refinement";
import type {
  AskEngineResult,
  AskTurnInput,
  ActiveFilters,
  RefinementHistoryEntry,
  SearchContext,
} from "@/lib/ask/types";
import {
  buildClarifyingQuestions,
  composeClarificationSearchQuery,
  detectCapabilityMismatch,
  formatClarifyingQuestionsForPrompt,
  isClarificationFollowUp,
} from "@/lib/ask/clarifying-questions";
import { deriveSessionHints } from "@/lib/ask/session-context";
import {
  getAmbientContext,
  formatAmbientContextForPrompt,
  type AmbientContext,
} from "@/lib/ask/ambient-context";

const MAX_TOOL_STEPS = 5;

export async function loadTurnContext(
  artifactSessionId?: string,
): Promise<{
  activeFilters: ActiveFilters;
  searchContext: SearchContext;
  refinementHistory: RefinementHistoryEntry[];
  existingArtifact?: AskEngineResult["artifact"];
}> {
  if (!artifactSessionId) {
    return {
      activeFilters: {},
      searchContext: { lastQuery: "", lastTool: null, resultCount: 0 },
      refinementHistory: [],
    };
  }
  const row = await loadArtifactSession(artifactSessionId);
  if (!row) {
    return {
      activeFilters: {},
      searchContext: { lastQuery: "", lastTool: null, resultCount: 0 },
      refinementHistory: [],
    };
  }
  return {
    activeFilters: (row.active_filters as ActiveFilters) ?? {},
    searchContext: (row.search_context as SearchContext) ?? {
      lastQuery: "",
      lastTool: null,
      resultCount: 0,
    },
    refinementHistory: (row.refinement_history as RefinementHistoryEntry[]) ?? [],
    existingArtifact: row.artifact_json as AskEngineResult["artifact"],
  };
}

function buildMessages(
  history: ModelMessage[],
  userMessage: string,
  refinementHint?: string,
  clarifyingQuestions?: string,
  capabilityDisclosure?: string,
  ambientContext?: AmbientContext,
  clarificationAnswered?: boolean,
): ModelMessage[] {
  let systemExtra = refinementHint ? `\n\nRefinement context: ${refinementHint}` : "";

  if (ambientContext) {
    const contextText = formatAmbientContextForPrompt(ambientContext);
    if (contextText) systemExtra += contextText;
  }

  if (capabilityDisclosure) {
    systemExtra +=
      `\n\nCAPABILITY DISCLOSURE REQUIRED — before searching or answering, disclose this limitation ` +
      `in 1-2 warm sentences, then ask if the user still wants to search:\n${capabilityDisclosure}\n` +
      `If they confirm (or imply yes), immediately call searchBusinesses. If they say no, don't search.`;
  }

  if (clarifyingQuestions) {
    // The actual questions are shown as a UI form in the artifact panel.
    // The LLM only needs to write a warm 1-sentence intro — DO NOT list the questions in text.
    systemExtra +=
      `\n\nCLARIFY MODE — A question form has been shown to the user in the results panel. ` +
      `Write ONE warm sentence inviting them to fill it out (e.g. "Just a couple of quick questions to find you the best match!"). ` +
      `Do NOT call searchBusinesses. Do NOT list the questions. Keep it to one sentence.`;
  }

  if (clarificationAnswered) {
    systemExtra +=
      `\n\nCLARIFICATION ANSWERED — The user submitted answers from the question form. ` +
      `Their latest message combines those answers with their original request (see conversation history). ` +
      `Call searchBusinesses NOW with the full combined intent. Do NOT ask more clarifying questions.`;
  }

  return [
    { role: "system", content: ASK_SYSTEM_PROMPT + systemExtra },
    ...history,
    { role: "user", content: userMessage },
  ];
}

async function prepareTurn(input: AskTurnInput) {
  const conversationId = await ensureConversation({
    conversationId: input.conversationId,
    channel: input.channel,
    sessionKey: input.sessionKey,
    userId: input.userId,
  });

  await appendMessage({
    conversationId,
    role: "user",
    content: input.message,
  });

  const prior = await loadTurnContext(input.artifactSessionId);
  const hasArtifact = isSearchResultsArtifact(prior.existingArtifact);
  const clarificationFollowUp = isClarificationFollowUp(prior.existingArtifact);
  const refinementIntent = classifyRefinementIntent(
    input.message,
    hasArtifact || clarificationFollowUp,
    prior.existingArtifact?.type,
  );
  const refined = refineSearch({
    message: input.message,
    intent: refinementIntent,
    activeFilters: prior.activeFilters,
    searchContext: prior.searchContext,
    refinementHistory: prior.refinementHistory,
    existingArtifact: prior.existingArtifact,
  });

  const history = await loadConversationMessages(conversationId);
  const historyForModel = history.slice(0, -1);

  const isNewSearch =
    (refinementIntent === "new_search" || (!input.artifactSessionId && !refined.forkSession)) &&
    !clarificationFollowUp;

  // Fetch ambient context (weather + season) in parallel with capability check.
  // Cached 30 min — never throws.
  const [ambientContext, capabilityMismatch] = await Promise.all([
    getAmbientContext(),
    Promise.resolve(isNewSearch ? detectCapabilityMismatch(input.message) : null),
  ]);
  const capabilityDisclosureText = capabilityMismatch?.disclosure ?? undefined;

  const sessionHints = deriveSessionHints({
    message: input.message,
    activeFilters: prior.activeFilters,
    searchContext: prior.searchContext,
    refinementHistory: prior.refinementHistory,
  });

  // Clarifying questions: only when no capability issue is blocking us.
  const clarifyQuestions =
    !capabilityMismatch && isNewSearch && !clarificationFollowUp
      ? await buildClarifyingQuestions(input.message, isNewSearch, ambientContext, sessionHints)
      : [];
  const clarifyingQuestionsText = clarifyQuestions.length
    ? formatClarifyingQuestionsForPrompt(clarifyQuestions)
    : undefined;

  const clarificationOriginalQuery =
    clarificationFollowUp && prior.existingArtifact?.type === "clarification_form"
      ? prior.existingArtifact.originalQuery
      : undefined;
  const combinedSearchMessage = clarificationOriginalQuery
    ? composeClarificationSearchQuery(clarificationOriginalQuery, input.message)
    : input.message;

  const toolCtx: AskToolContext = {
    conversationId,
    artifactSessionId: refined.forkSession ? undefined : input.artifactSessionId,
    userMessage: combinedSearchMessage,
    ipKey: input.ipKey,
    userAgent: input.userAgent,
    activeFilters: refined.activeFilters,
    sources: [],
    confidenceScore: 0.5,
    handoffRequired: false,
    followUps: [],
    ambientContext,
    clarifyMode: clarifyQuestions.length > 0,
    sessionHints,
  };

  // Pre-populate the artifact with the clarification form.
  // The LLM just needs to say a brief intro — the form does the actual work.
  if (clarifyQuestions.length > 0) {
    toolCtx.artifact = {
      type: "clarification_form",
      questions: clarifyQuestions,
      originalQuery: input.message,
    };
  }

  return {
    conversationId,
    prior,
    refinementIntent,
    refined,
    historyForModel,
    toolCtx,
    clarifyingQuestionsText,
    capabilityDisclosureText,
    ambientContext,
    clarificationFollowUp,
  };
}

function buildSearchContext(
  artifact: NonNullable<AskToolContext["artifact"]>,
  composedQuery: string,
): SearchContext {
  return {
    lastQuery: composedQuery,
    lastTool: searchToolForArtifact(artifact),
    resultCount: resultCountFromArtifact(artifact),
  };
}

async function persistTurnResult(opts: {
  conversationId: string;
  refinementIntent: string;
  refinementHistory: RefinementHistoryEntry[];
  composedQuery: string;
  forkSession: boolean;
  artifactSessionId?: string;
  toolCtx: AskToolContext;
  assistantText: string;
  started: number;
}): Promise<string | undefined> {
  let artifactSessionId = opts.artifactSessionId;

  if (opts.toolCtx.artifact) {
    const searchContext = buildSearchContext(opts.toolCtx.artifact, opts.composedQuery);
    artifactSessionId = await saveArtifactSession({
      id: opts.forkSession ? undefined : opts.artifactSessionId,
      conversationId: opts.conversationId,
      artifact: opts.toolCtx.artifact,
      searchContext,
      activeFilters: opts.toolCtx.activeFilters,
      refinementHistory: opts.refinementHistory,
    });
  }

  await appendMessage({
    conversationId: opts.conversationId,
    role: "assistant",
    content: opts.assistantText,
    metadata: {
      artifactSessionId,
      confidenceScore: opts.toolCtx.confidenceScore,
    },
  });

  await logConversationEvent(opts.conversationId, "turn_complete", {
    latencyMs: Date.now() - opts.started,
    refinementIntent: opts.refinementIntent,
    confidenceScore: opts.toolCtx.confidenceScore,
    artifactType: opts.toolCtx.artifact?.type,
  });

  return artifactSessionId;
}

export async function runAskTurn(input: AskTurnInput): Promise<AskEngineResult> {
  const started = Date.now();
  const { conversationId, refinementIntent, refined, historyForModel, toolCtx, clarifyingQuestionsText, capabilityDisclosureText, ambientContext, clarificationFollowUp } =
    await prepareTurn(input);

  const tools = createAskTools(toolCtx);
  const model = openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");

  const { text } = await generateText({
    model,
    messages: buildMessages(
      historyForModel,
      input.message,
      refined.refinementHint,
      clarifyingQuestionsText,
      capabilityDisclosureText,
      ambientContext,
      clarificationFollowUp,
    ),
    tools,
    stopWhen: stepCountIs(MAX_TOOL_STEPS),
    // Force a tool call when answering clarification — prevents the LLM from
    // asking follow-up questions instead of searching, which causes a loop.
    toolChoice: clarificationFollowUp ? "required" : undefined,
  });

  const assistantText = text.trim() || "Here's what I found in our verified listings.";
  const artifactSessionId = await persistTurnResult({
    conversationId,
    refinementIntent,
    refinementHistory: refined.refinementHistory,
    composedQuery: refined.composedQuery,
    forkSession: refined.forkSession,
    artifactSessionId: input.artifactSessionId,
    toolCtx,
    assistantText,
    started,
  });

  const shareableArtifactSummary = toolCtx.artifact
    ? generateArtifactSummary(toolCtx.artifact)
    : undefined;

  const result: AskEngineResult = {
    conversationId,
    artifactSessionId,
    message: assistantText,
    artifact: compressArtifactForChannel(toolCtx.artifact, input.channel),
    shareableArtifactSummary,
    followUps: toolCtx.followUps.slice(0, 3),
    confidenceScore: toolCtx.confidenceScore,
    handoffRequired: toolCtx.handoffRequired,
    sources: toolCtx.sources,
  };

  if (input.channel === "sms") {
    const sms = formatForSms(result);
    return { ...result, message: sms.text };
  }
  return formatForWeb(result);
}

export async function streamAskTurn(input: AskTurnInput) {
  const started = Date.now();
  const { conversationId, refinementIntent, refined, historyForModel, toolCtx, clarifyingQuestionsText, capabilityDisclosureText, ambientContext, clarificationFollowUp } =
    await prepareTurn(input);

  const tools = createAskTools(toolCtx);
  const model = openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");

  let resolvedSessionId = refined.forkSession ? undefined : input.artifactSessionId;

  // Resolves after onFinish completes (including the db write).
  // The API route must await this before reading artifactSessionId — the getter
  // returns the correct value only after persistTurnResult has run.
  let _onFinishDone!: () => void;
  const ready = new Promise<void>((resolve) => { _onFinishDone = resolve; });

  const result = streamText({
    model,
    messages: buildMessages(
      historyForModel,
      input.message,
      refined.refinementHint,
      clarifyingQuestionsText,
      capabilityDisclosureText,
      ambientContext,
      clarificationFollowUp,
    ),
    tools,
    stopWhen: stepCountIs(MAX_TOOL_STEPS),
    toolChoice: clarificationFollowUp ? "required" : undefined,
    onFinish: async ({ text }) => {
      const assistantText = text.trim() || "Here's what I found in our verified listings.";
      resolvedSessionId = await persistTurnResult({
        conversationId,
        refinementIntent,
        refinementHistory: refined.refinementHistory,
        composedQuery: refined.composedQuery,
        forkSession: refined.forkSession,
        artifactSessionId: input.artifactSessionId,
        toolCtx,
        assistantText,
        started,
      });
      _onFinishDone();
    },
  });

  return {
    conversationId,
    toolCtx,
    refined,
    result,
    ready,
    get artifactSessionId() {
      return resolvedSessionId;
    },
  };
}
