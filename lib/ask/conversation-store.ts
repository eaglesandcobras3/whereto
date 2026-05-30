import "server-only";
import type { ModelMessage } from "ai";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { AskChannel } from "@/lib/ask/types";
import type { ActiveFilters, AskArtifact, RefinementHistoryEntry, SearchContext } from "@/lib/ask/types";

export async function ensureConversation(opts: {
  conversationId?: string;
  channel: AskChannel;
  sessionKey: string;
  userId?: string | null;
}): Promise<string> {
  const supabase = getServiceSupabase();
  if (opts.conversationId) {
    const { data } = await supabase
      .from("ask_conversations")
      .select("id")
      .eq("id", opts.conversationId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data, error } = await supabase
    .from("ask_conversations")
    .insert({
      channel: opts.channel,
      session_key: opts.sessionKey,
      user_id: opts.userId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Failed to create conversation");
  return data.id as string;
}

/** Recent transcript for multi-turn model context (excludes current user message). */
export async function loadConversationMessages(
  conversationId: string,
  limit = 20,
): Promise<ModelMessage[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("ask_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("date_created", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: (row.content as string) ?? "",
  }));
}

export async function appendMessage(opts: {
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: unknown;
  metadata?: unknown;
}): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase.from("ask_messages").insert({
    conversation_id: opts.conversationId,
    role: opts.role,
    content: opts.content,
    tool_calls: opts.toolCalls ?? null,
    metadata: opts.metadata ?? null,
  });
}

export async function loadArtifactSession(sessionId: string) {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("ask_artifact_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  return data;
}

export async function saveArtifactSession(opts: {
  id?: string;
  conversationId: string;
  artifact: AskArtifact;
  searchContext: SearchContext;
  activeFilters: ActiveFilters;
  refinementHistory: RefinementHistoryEntry[];
}): Promise<string> {
  const supabase = getServiceSupabase();
  const row = {
    conversation_id: opts.conversationId,
    artifact_type: opts.artifact.type,
    artifact_json: opts.artifact,
    search_context: opts.searchContext,
    active_filters: opts.activeFilters,
    refinement_history: opts.refinementHistory,
  };

  if (opts.id) {
    await supabase.from("ask_artifact_sessions").update(row).eq("id", opts.id);
    return opts.id;
  }

  const { data, error } = await supabase
    .from("ask_artifact_sessions")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) throw new Error("Failed to save artifact session");
  return data.id as string;
}

export async function logConversationEvent(
  conversationId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase.from("conversation_events").insert({
    conversation_id: conversationId,
    event_type: eventType,
    payload,
  });
}
