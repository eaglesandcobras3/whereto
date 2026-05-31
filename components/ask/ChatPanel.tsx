"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskArtifactRichCard } from "@/components/ask/AskArtifactRichCard";
import { AskSearchDebugPanel } from "@/components/ask/AskSearchDebugPanel";
import type { AskSearchDebug } from "@/lib/ask/search-debug";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isRichArtifact } from "@/lib/ask/artifact-rich-card";
import type { AskArtifact } from "@/lib/ask/types";

type AskArtifactData = {
  conversationId?: string;
  artifactSessionId?: string;
  artifact?: AskArtifact | null;
  confidenceScore?: number;
  handoffRequired?: boolean;
  shareableArtifactSummary?: string;
  searchDebug?: AskSearchDebug | null;
};

type Props = {
  sessionKey: string;
  conversationId: string | undefined;
  artifactSessionId: string | undefined;
  onMetaUpdate: (data: AskArtifactData) => void;
  refineMessage?: string | null;
  onRefineConsumed?: () => void;
  artifact?: AskArtifact;
  artifactPanelOpen?: boolean;
  onOpenArtifactPanel?: () => void;
  searchDebug?: AskSearchDebug;
  /** From `/ask?q=` — auto-sent once on load. */
  initialQuery?: string;
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
  artifact,
  artifactPanelOpen,
  onOpenArtifactPanel,
  searchDebug,
  initialQuery,
}: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialQuerySent = useRef(false);

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
      }
    },
  });

  const busy = status === "streaming" || status === "submitted";
  const showRichCard = artifact && isRichArtifact(artifact) && messages.length > 0;

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "";
      }
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

  useEffect(() => {
    const q = initialQuery?.trim();
    if (!q || initialQuerySent.current || busy) return;
    initialQuerySent.current = true;
    submit(q);
  }, [initialQuery, busy, submit]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status, artifact]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, window.innerWidth < 640 ? 128 : 200)}px`;
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-4 sm:py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center sm:py-20">
              <h1 className="text-page-title text-foreground">Ask WhereTo30A</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Local discovery from verified listings — restaurants, coffee, activities, and
                guides on 30A.
              </p>
            </div>
          ) : (
            <ul className="space-y-4 pb-2">
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
                        "max-w-[min(90%,36rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        isUser
                          ? "rounded-br-md bg-primary text-primary-foreground shadow-premium-sm"
                          : "rounded-bl-md text-foreground",
                      )}
                    >
                      {text}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {busy && messages.length > 0 ? (
            <div className="flex justify-start py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Thinking…
              </div>
            </div>
          ) : null}

          {showRichCard && onOpenArtifactPanel ? (
            <div className="flex justify-start">
              <AskArtifactRichCard
                artifact={artifact}
                onOpen={onOpenArtifactPanel}
                isPanelOpen={artifactPanelOpen}
              />
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>Something went wrong. Please try again.</AlertDescription>
            </Alert>
          ) : null}

          {searchDebug ? <AskSearchDebugPanel debug={searchDebug} /> : null}
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border bg-background",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="mx-auto w-full max-w-3xl px-4 pt-2 sm:pt-3">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                resizeTextarea();
              }}
              placeholder="Ask about 30A…"
              rows={2}
              disabled={busy}
              className={cn(
                "max-h-[8rem] resize-none rounded-2xl border-border bg-card py-3 pr-14 text-base leading-relaxed shadow-premium-sm",
                "min-h-[3.25rem] sm:min-h-[4.5rem] sm:max-h-[12.5rem] sm:py-4",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
            />
            <Button
              type="submit"
              disabled={busy || !input.trim()}
              size="icon"
              className="absolute right-2.5 bottom-2.5 size-10 rounded-full"
              aria-label={busy ? "Sending" : "Send message"}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <ArrowUp className="size-5" aria-hidden />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
