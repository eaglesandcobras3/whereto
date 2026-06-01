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
 * Questions with allowFreeText → chips + a free-text input below.
 * On submit, compiles answers into a natural-language message sent as the next user turn.
 * Users can always submit to proceed — unanswered questions are simply omitted.
 */
export function ClarificationFormArtifact({ artifact, onSubmit }: Props) {
  // Chip selections
  const [chipAnswers, setChipAnswers] = useState<Record<string, string>>({});
  // Free-text overrides (for allowFreeText questions)
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  const setChip = (id: string, value: string) =>
    setChipAnswers((prev) => ({ ...prev, [id]: value }));

  const setText = (id: string, value: string) =>
    setTextAnswers((prev) => ({ ...prev, [id]: value }));

  /** Effective answer for a question: free-text wins over chip if non-empty. */
  const getAnswer = (id: string) =>
    textAnswers[id]?.trim() || chipAnswers[id]?.trim() || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = artifact.questions
      .map((q) => getAnswer(q.id))
      .filter(Boolean);
    onSubmit(parts.join(" • "));
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-5 pb-2">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain">
        {artifact.questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium text-foreground">{q.question}</p>

            {q.suggestions?.length ? (
              <>
                {/* Chip-style radio buttons */}
                <div className="flex flex-wrap gap-2">
                  {q.suggestions.map((opt) => {
                    const selected = chipAnswers[q.id] === opt && !textAnswers[q.id]?.trim();
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setChip(q.id, selected ? "" : opt);
                          // Clear free-text when a chip is selected
                          if (q.allowFreeText) setText(q.id, "");
                        }}
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
                {/* Optional free-text input below chips */}
                {q.allowFreeText ? (
                  <Input
                    value={textAnswers[q.id] ?? ""}
                    onChange={(e) => {
                      setText(q.id, e.target.value);
                      // Clear chip when user types
                      if (e.target.value) setChip(q.id, "");
                    }}
                    placeholder="Or type a specific area…"
                    className="max-w-xs"
                  />
                ) : null}
              </>
            ) : (
              // Free-text only
              <Input
                value={textAnswers[q.id] ?? ""}
                onChange={(e) => setText(q.id, e.target.value)}
                placeholder="Type your answer…"
                className="max-w-xs"
              />
            )}
          </div>
        ))}
      </div>

      <Button
        type="submit"
        className="sticky bottom-0 w-full shrink-0"
      >
        Search
      </Button>
    </form>
  );
}
