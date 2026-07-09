"use client";

import { useEffect } from "react";

import { identifyPostHogUser, resetPostHogUser } from "@/lib/analytics/posthog-auth";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";
import type { AuthSessionUser } from "@/lib/auth/types";

type Props = {
  user: AuthSessionUser | null;
};

/** Keep PostHog identity aligned with the server session (no browser Supabase). */
export function PostHogUserSync({ user }: Props) {
  useEffect(() => {
    if (!isPostHogEnabled()) return;

    if (user) {
      identifyPostHogUser(user);
      return;
    }

    resetPostHogUser();
  }, [user]);

  return null;
}
