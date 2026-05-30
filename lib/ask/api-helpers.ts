import { z } from "zod";

export const MAX_ASK_BODY_BYTES = 32_000;

export const askMessageBodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  artifactSessionId: z.string().uuid().optional(),
  sessionKey: z.string().max(128).optional(),
});

export const askChatBodySchema = z.object({
  id: z.string().optional(),
  messages: z
    .array(
      z.object({
        id: z.string().optional(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z
          .array(
            z.object({
              type: z.string(),
              text: z.string().optional(),
            }),
          )
          .optional(),
        content: z.string().optional(),
      }),
    )
    .min(1),
  conversationId: z.string().uuid().optional(),
  artifactSessionId: z.string().uuid().optional(),
  sessionKey: z.string().max(128).optional(),
});

export function lastUserTextFromChatMessages(
  messages: z.infer<typeof askChatBodySchema>["messages"],
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (m.content?.trim()) return m.content.trim();
    const textPart = m.parts?.find((p) => p.type === "text" && p.text?.trim());
    if (textPart?.text) return textPart.text.trim();
  }
  return "";
}

export function sessionKeyFromRequest(
  request: Request,
  bodyKey?: string,
): string {
  if (bodyKey?.trim()) return bodyKey.trim();
  const cookie = request.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)w30a_sid=([^;]+)/.exec(cookie);
  if (match?.[1]) return match[1].trim();
  return "anon";
}
