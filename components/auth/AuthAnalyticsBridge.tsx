import { PostHogUserSync } from "@/components/analytics/PostHogUserSync";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function AuthAnalyticsBridge() {
  const user = await getSessionUser();
  return <PostHogUserSync user={user} />;
}
