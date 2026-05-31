"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ClarificationFormArtifact } from "@/lib/ask/types";

type Props = {
  artifact: ClarificationFormArtifact;
  onSubmit: (message: string) => void;
};

/**
 * Renders clarifying questions as a tap-to-select chip form.
 * Questions with suggestions → chip radio buttons.
 * Questions without suggestions → text input.
 * On submit, compiles answers into a natural-language message sent as the next user turn.
 */
export function ClarificationFormArtifact({ artifact, onSubmit }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const setAnswer = (id: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = artifact.questions
      .map((q) => {
        const ans = answers[q.id]?.trim();
        if (!ans) return null;
        return ans;
      })
      .filter(Boolean);

    if (!parts.length) return;
    onSubmit(parts.join(" • "));
  };

  const hasAnyAnswer = artifact.questions.some((q) => answers[q.id]?.trim());

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-5 pb-2">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain">
      {artifact.questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-medium text-foreground">{q.question}</p>

          {q.suggestions?.length ? (
            // Chip-style radio buttons
            <div className="flex flex-wrap gap-2">
              {q.suggestions.map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setAnswer(q.id, selected ? "" : opt)
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/60 hover:bg-accent",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            // Free-text input
            <Input
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Type your answer…"
              className="max-w-xs"
            />
          )}
        </div>
      ))}

      </div>

      <Button
        type="submit"
        disabled={!hasAnyAnswer}
        className="sticky bottom-0 w-full shrink-0"
      >
        Search
      </Button>
    </form>
  );
}
