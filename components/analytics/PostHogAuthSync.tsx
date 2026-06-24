"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { identifyPostHogUser, resetPostHogUser } from "@/lib/analytics/posthog-auth";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";

/** Keep PostHog identity aligned with the Supabase session (restore + sign-out). */
export function PostHogAuthSync() {
  useEffect(() => {
    if (!isPostHogEnabled()) return;

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (user) {
        identifyPostHogUser({ id: user.id, email: user.email });
        return;
      }
      if (event === "SIGNED_OUT") {
        resetPostHogUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
