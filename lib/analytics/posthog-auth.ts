import posthog from "posthog-js";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";

type PostHogAuthUser = {
  id: string;
  email?: string | null;
};

function personProperties(user: PostHogAuthUser) {
  return user.email ? { email: user.email } : {};
}

/** Link the Supabase user to PostHog when the distinct ID changes. */
export function identifyPostHogUser(user: PostHogAuthUser): void {
  if (!isPostHogEnabled()) return;
  if (posthog.get_distinct_id() === user.id) return;
  posthog.identify(user.id, personProperties(user));
}

/** Wait for feature flags to reload after identifying (login/signup navigation). */
export function identifyPostHogUserAndWaitForFlags(user: PostHogAuthUser): Promise<void> {
  if (!isPostHogEnabled()) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => resolve();
    const timeout = window.setTimeout(finish, 5_000);
    const unsubscribe = posthog.onFeatureFlags(() => {
      window.clearTimeout(timeout);
      unsubscribe();
      finish();
    });

    if (posthog.get_distinct_id() === user.id) {
      posthog.reloadFeatureFlags();
      return;
    }

    posthog.identify(user.id, personProperties(user));
  });
}

/** Clear PostHog identity when the Supabase session ends. */
export function resetPostHogUser(): void {
  if (!isPostHogEnabled()) return;
  posthog.reset();
}
