/**
 * Clarification query helpers safe for client and server (no `server-only`).
 */

import type { ClarificationFormArtifact } from "@/lib/ask/types";

export function isClarificationFollowUp(
  artifact: ClarificationFormArtifact | { type: string } | undefined,
): artifact is ClarificationFormArtifact {
  return artifact?.type === "clarification_form";
}

/** Merge the original ask with chip-form answers for search. */
export function composeClarificationSearchQuery(
  originalQuery: string,
  answers: string,
): string {
  const original = originalQuery.trim();
  const detail = answers.trim();
  if (!original) return detail;
  if (!detail) return original;
  return `${original}. ${detail}`;
}
