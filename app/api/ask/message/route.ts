import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { askApiBlocked } from "@/lib/feature-flags";
import { runAskTurn } from "@/lib/ask/askEngine";
import {
  askMessageBodySchema,
  MAX_ASK_BODY_BYTES,
  sessionKeyFromRequest,
} from "@/lib/ask/api-helpers";
import { getClientIp } from "@/lib/security/getClientIp";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { isAskChatRateLimited, rateLimitKeyFromRequest } from "@/lib/security/rateLimit";
import { validateAskOrigin } from "@/lib/security/validateOrigin";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const blocked = await askApiBlocked();
  if (blocked) return blocked;

  if (!validateAskOrigin(request)) {
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
      path: "/api/ask/message",
    });
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "Ask is unavailable." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = askMessageBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const result = await runAskTurn({
      channel: "mobile",
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      artifactSessionId: parsed.data.artifactSessionId,
      sessionKey: sessionKeyFromRequest(request, parsed.data.sessionKey),
      userId: user?.id ?? null,
      ipKey,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
