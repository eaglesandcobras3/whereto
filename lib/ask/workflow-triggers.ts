import "server-only";

/** Start a durable workflow when the workflow runtime is available. */
export async function startWorkflowByName(
  name: "business-submission" | "feedback" | "human-review",
  payload: Record<string, string>,
): Promise<void> {
  try {
    const { start } = await import("workflow/api");
    if (name === "business-submission") {
      const { businessSubmissionWorkflow } = await import(
        "@/workflows/business-submission"
      );
      await start(businessSubmissionWorkflow, [payload]);
    } else if (name === "feedback") {
      const { feedbackWorkflow } = await import("@/workflows/feedback");
      await start(feedbackWorkflow, [payload]);
    } else {
      const { humanReviewWorkflow } = await import("@/workflows/human-review");
      await start(humanReviewWorkflow, [payload]);
    }
  } catch (e) {
    console.error(`[ask] workflow start failed (${name}):`, e);
  }
}
