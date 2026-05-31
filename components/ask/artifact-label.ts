import type { AskArtifact } from "@/lib/ask/types";

/** Short label for mobile results bar / sheet trigger */
export function artifactShortLabel(artifact: AskArtifact): string {
  switch (artifact.type) {
    case "business_results":
      return artifact.title || `${artifact.results.length} places`;
    case "guide_results":
      return artifact.title || `${artifact.results.length} guides`;
    case "town_results":
      return artifact.title || `${artifact.results.length} towns`;
    case "area_results":
      return artifact.title || `${artifact.results.length} areas`;
    case "empty_state":
      return artifact.title;
    case "business_submission_form":
      return "List your business";
    case "feedback_form":
      return "Report an issue";
    case "human_handoff_status":
      return "Request in review";
    case "clarification_form":
      return "A couple of questions";
  }
}
