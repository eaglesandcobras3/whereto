import type { AskArtifact } from "@/lib/ask/types";

/** Artifacts that warrant the full results panel (opened via inline rich card). */
export function isRichArtifact(artifact: AskArtifact): boolean {
  switch (artifact.type) {
    case "business_results":
    case "guide_results":
    case "town_results":
    case "area_results":
    case "business_submission_form":
    case "feedback_form":
    case "human_handoff_status":
      return true;
    case "empty_state":
      return false;
    case "clarification_form":
      return true;
  }
}

export type RichCardPreview = {
  title: string;
  subtitle: string;
  imageUrl?: string | null;
};

export function richCardPreview(artifact: AskArtifact): RichCardPreview {
  switch (artifact.type) {
    case "business_results": {
      const first = artifact.results[0];
      return {
        title: artifact.title,
        subtitle: `${artifact.results.length} verified ${artifact.results.length === 1 ? "place" : "places"}`,
        imageUrl: first?.image_url ?? null,
      };
    }
    case "guide_results": {
      const first = artifact.results[0];
      return {
        title: artifact.title,
        subtitle: `${artifact.results.length} ${artifact.results.length === 1 ? "guide" : "guides"}`,
        imageUrl: first?.hero_image_url ?? null,
      };
    }
    case "town_results": {
      const first = artifact.results[0];
      return {
        title: artifact.title,
        subtitle: `${artifact.results.length} ${artifact.results.length === 1 ? "town" : "towns"}`,
        imageUrl: first?.hero_image_url ?? null,
      };
    }
    case "area_results": {
      const first = artifact.results[0];
      return {
        title: artifact.title,
        subtitle: `${artifact.results.length} ${artifact.results.length === 1 ? "area" : "areas"}`,
        imageUrl: first?.hero_image_url ?? null,
      };
    }
    case "business_submission_form":
      return { title: "List your business", subtitle: "Submit a listing request" };
    case "feedback_form":
      return { title: "Report an issue", subtitle: "Help us fix listing details" };
    case "human_handoff_status":
      return { title: "Request in review", subtitle: artifact.message };
    case "empty_state":
      return { title: artifact.title, subtitle: artifact.message };
    case "clarification_form":
      return { title: "A couple of questions", subtitle: `${artifact.questions.length} quick question${artifact.questions.length !== 1 ? "s" : ""}` };
  }
}
