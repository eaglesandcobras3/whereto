export const FEEDBACK_TYPES = [
  "not_relevant",
  "had_bad_experience",
  "hide_for_me",
  "inaccurate_info",
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

const ALLOWED = new Set<string>(FEEDBACK_TYPES);

export type ParsedFeedbackBody = {
  business_id: string;
  feedback_type: FeedbackType;
  feedback_reason: string | null;
  query_context: string | null;
  session_id: string | null;
  notes: string | null;
};

export function parseFeedbackBody(body: unknown):
  | { ok: true; data: ParsedFeedbackBody }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const o = body as Record<string, unknown>;
  const business_id =
    typeof o.business_id === "string" ? o.business_id.trim() : "";
  const feedback_type =
    typeof o.feedback_type === "string" ? o.feedback_type : "";
  if (!business_id || !ALLOWED.has(feedback_type)) {
    return { ok: false, error: "Invalid feedback" };
  }
  return {
    ok: true,
    data: {
      business_id,
      feedback_type: feedback_type as FeedbackType,
      feedback_reason:
        typeof o.feedback_reason === "string" ? o.feedback_reason : null,
      query_context:
        typeof o.query_context === "string" ? o.query_context : null,
      session_id: typeof o.session_id === "string" ? o.session_id : null,
      notes: typeof o.notes === "string" ? o.notes : null,
    },
  };
}

/** Whether we should upsert into user_suppressions for this feedback. */
export function shouldUpsertSuppression(
  feedbackType: FeedbackType,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  return (
    feedbackType === "hide_for_me" || feedbackType === "had_bad_experience"
  );
}
