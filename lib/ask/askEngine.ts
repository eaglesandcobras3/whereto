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
import { followUpSuggested } from "@/lib/ask/confidence";
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
): ModelMessage[] {
  const systemExtra = refinementHint
    ? `\n\nRefinement context: ${refinementHint}`
    : "";
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
  const refinementIntent = classifyRefinementIntent(input.message, hasArtifact);
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

  const toolCtx: AskToolContext = {
    conversationId,
    artifactSessionId: refined.forkSession ? undefined : input.artifactSessionId,
    ipKey: input.ipKey,
    userAgent: input.userAgent,
    activeFilters: refined.activeFilters,
    sources: [],
    confidenceScore: 0.5,
    handoffRequired: false,
    followUps: [],
  };

  return {
    conversationId,
    prior,
    refinementIntent,
    refined,
    historyForModel,
    toolCtx,
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
  const { conversationId, refinementIntent, refined, historyForModel, toolCtx } =
    await prepareTurn(input);

  const tools = createAskTools(toolCtx);
  const model = openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");

  const { text } = await generateText({
    model,
    messages: buildMessages(historyForModel, input.message, refined.refinementHint),
    tools,
    stopWhen: stepCountIs(MAX_TOOL_STEPS),
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

  let followUps = toolCtx.followUps;
  if (followUpSuggested(toolCtx.confidenceScore) && followUps.length === 0) {
    followUps = [
      "Want something more casual?",
      "Narrow by town?",
      "Any dietary needs?",
    ];
  }

  const result: AskEngineResult = {
    conversationId,
    artifactSessionId,
    message: assistantText,
    artifact: compressArtifactForChannel(toolCtx.artifact, input.channel),
    shareableArtifactSummary,
    followUps: followUps.slice(0, 3),
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
  const { conversationId, refinementIntent, refined, historyForModel, toolCtx } =
    await prepareTurn(input);

  const tools = createAskTools(toolCtx);
  const model = openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");

  let resolvedSessionId = refined.forkSession ? undefined : input.artifactSessionId;

  const result = streamText({
    model,
    messages: buildMessages(historyForModel, input.message, refined.refinementHint),
    tools,
    stopWhen: stepCountIs(MAX_TOOL_STEPS),
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
    },
  });

  return {
    conversationId,
    toolCtx,
    refined,
    result,
    get artifactSessionId() {
      return resolvedSessionId;
    },
  };
}
