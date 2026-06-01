import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { askApiBlocked } from "@/lib/feature-flags";
import { streamAskTurn } from "@/lib/ask/askEngine";
import {
  askChatBodySchema,
  lastUserTextFromChatMessages,
  MAX_ASK_BODY_BYTES,
  sessionKeyFromRequest,
} from "@/lib/ask/api-helpers";
import { generateArtifactSummary } from "@/lib/ask/shareArtifacts";
import { getClientIp } from "@/lib/security/getClientIp";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { isAskChatRateLimited, rateLimitKeyFromRequest } from "@/lib/security/rateLimit";
import { validateAskOrigin } from "@/lib/security/validateOrigin";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const blocked = await askApiBlocked();
  if (blocked) return blocked;

  if (!validateAskOrigin(request)) {
    await logSecurityEvent({
      eventType: "ask_bad_origin",
      ipKey: getClientIp(request),
      path: "/api/ask",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_ASK_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const ipKey = rateLimitKeyFromRequest(request);
  if (await isAskChatRateLimited(ipKey)) {
    await logSecurityEvent({
      eventType: "ask_rate_limit",
      ipKey,
      path: "/api/ask",
    });
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Ask is unavailable right now." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = askChatBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userMessage = lastUserTextFromChatMessages(parsed.data.messages);
  if (!userMessage) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sessionKey = sessionKeyFromRequest(request, parsed.data.sessionKey);

  // Keep the full result object — don't destructure artifactSessionId here.
  // The getter returns resolvedSessionId which is only finalized inside onFinish
  // (a db write). We read it after awaiting `ready` to ensure correct ordering.
  const streamResult = await streamAskTurn({
    channel: "web",
    message: userMessage,
    conversationId: parsed.data.conversationId,
    artifactSessionId: parsed.data.artifactSessionId,
    sessionKey,
    userId: user?.id ?? null,
    ipKey,
    userAgent: request.headers.get("user-agent"),
  });
  const { conversationId, toolCtx, result, ready } = streamResult;

  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      writer.merge(result.toUIMessageStream());
      await result.text;
      // Explicitly wait for onFinish (and its db write) to complete before
      // reading the session ID — result.text may resolve before onFinish does.
      await ready;

      writer.write({
        type: "data-ask-artifact",
        data: {
          conversationId,
          artifactSessionId: streamResult.artifactSessionId,
          artifact: toolCtx.artifact ?? null,
          followUps: toolCtx.followUps.slice(0, 3),
          confidenceScore: toolCtx.confidenceScore,
          handoffRequired: toolCtx.handoffRequired,
          shareableArtifactSummary: toolCtx.artifact
            ? generateArtifactSummary(toolCtx.artifact)
            : undefined,
          searchDebug: toolCtx.searchDebug ?? null,
          searchProgress: toolCtx.searchProgress ?? null,
          searchSummary: toolCtx.searchSummary ?? null,
        },
      } as never);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
