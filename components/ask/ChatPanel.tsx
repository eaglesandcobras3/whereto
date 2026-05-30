"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StarterPrompts } from "@/components/ask/StarterPrompts";
import { FollowUpChips } from "@/components/ask/FollowUpChips";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AskArtifact } from "@/lib/ask/types";

type AskArtifactData = {
  conversationId?: string;
  artifactSessionId?: string;
  artifact?: AskArtifact;
  followUps?: string[];
  confidenceScore?: number;
  handoffRequired?: boolean;
  shareableArtifactSummary?: string;
};

type Props = {
  sessionKey: string;
  conversationId: string | undefined;
  artifactSessionId: string | undefined;
  onMetaUpdate: (data: AskArtifactData) => void;
  refineMessage?: string | null;
  onRefineConsumed?: () => void;
};

function messageText(parts: { type: string; text?: string }[] | undefined): string {
  if (!parts?.length) return "";
  return parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join("");
}

export function ChatPanel({
  sessionKey,
  conversationId,
  artifactSessionId,
  onMetaUpdate,
  refineMessage,
  onRefineConsumed,
}: Props) {
  const [input, setInput] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ask",
        body: {
          conversationId,
          artifactSessionId,
          sessionKey,
        },
      }),
    [conversationId, artifactSessionId, sessionKey],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onData: (part) => {
      if (part.type === "data-ask-artifact") {
        const data = part.data as AskArtifactData;
        onMetaUpdate(data);
        if (data.followUps?.length) setFollowUps(data.followUps);
      }
    },
  });

  const busy = status === "streaming" || status === "submitted";

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      void sendMessage({ text: trimmed });
    },
    [busy, sendMessage],
  );

  useEffect(() => {
    if (refineMessage?.trim()) {
      submit(refineMessage);
      onRefineConsumed?.();
    }
  }, [refineMessage, onRefineConsumed, submit]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="flex-1 px-4 py-4">
        {messages.length === 0 ? (
          <StarterPrompts onPick={submit} disabled={busy} />
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const text = messageText(m.parts as { type: string; text?: string }[]);
              if (!text) return null;
              return (
                <li
                  key={m.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-premium-sm",
                      isUser
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border bg-card text-card-foreground",
                    )}
                  >
                    {text}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>Something went wrong. Please try again.</AlertDescription>
          </Alert>
        ) : null}
        <FollowUpChips followUps={followUps} onPick={submit} disabled={busy} />
      </ScrollArea>

      <Separator />
      <form
        className="p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about 30A…"
          rows={2}
          disabled={busy}
          className="min-h-[4.5rem] resize-none rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" disabled={busy || !input.trim()} size="lg">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Thinking…
              </>
            ) : (
              "Send"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
