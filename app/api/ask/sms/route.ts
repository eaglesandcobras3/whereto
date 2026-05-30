import { NextRequest, NextResponse } from "next/server";
import { askApiBlocked } from "@/lib/feature-flags";
import { runAskTurn } from "@/lib/ask/askEngine";
import { z } from "zod";
import { getClientIp } from "@/lib/security/getClientIp";
import { isAskChatRateLimited, rateLimitKeyFromRequest } from "@/lib/security/rateLimit";
import { validateAskOrigin } from "@/lib/security/validateOrigin";

const smsBodySchema = z.object({
  message: z.string().trim().min(1).max(1000),
  from: z.string().max(40).optional(),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const blocked = await askApiBlocked();
  if (blocked) return blocked;

  if (!validateAskOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ipKey = rateLimitKeyFromRequest(request);
  if (await isAskChatRateLimited(ipKey)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = smsBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sessionKey = parsed.data.from ? `sms:${parsed.data.from}` : ipKey;

  try {
    const result = await runAskTurn({
      channel: "sms",
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      sessionKey,
      ipKey,
    });
    return NextResponse.json({
      text: result.message,
      conversationId: result.conversationId,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
