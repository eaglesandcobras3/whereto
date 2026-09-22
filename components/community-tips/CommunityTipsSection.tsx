"use client";

import { useCallback, useEffect, useState } from "react";
import posthog from "posthog-js";
import { tipAttributionSaid } from "@/lib/community-tips/attribution";
import { TipInitialsAvatar } from "@/components/community-tips/TipInitialsAvatar";
import type {
  CommunityTipEntityType,
  PublicCommunityTip,
} from "@/lib/community-tips/schema";
import { CommunityTipsGate } from "@/components/feature-flags/CommunityTipsGate";
import {
  signInWithPasswordAction,
  signUpAction,
} from "@/lib/auth/actions";
import { identifyPostHogUserAndWaitForFlags } from "@/lib/analytics/posthog-auth";

type Props = {
  entityType: CommunityTipEntityType;
  entityId: string;
  entityTitle: string;
  /** Server-prefetched published tips (optional). */
  initialTips?: PublicCommunityTip[];
};

type AuthMode = "signup" | "signin";

function TipStars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-amber-700" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-zinc-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function CommunityTipsSectionInner({
  entityType,
  entityId,
  entityTitle,
  initialTips = [],
}: Props) {
  const [tips, setTips] = useState<PublicCommunityTip[]>(initialTips);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [attributionCity, setAttributionCity] = useState("");
  const [body, setBody] = useState("");
  /** Empty string = no stars; otherwise 1–5. */
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const refreshPublished = useCallback(async () => {
    const res = await fetch(
      `/api/community-tips?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`,
    );
    if (!res.ok) return;
    const json = (await res.json()) as { tips?: PublicCommunityTip[] };
    setTips(json.tips ?? []);
  }, [entityType, entityId]);

  const refreshAuth = useCallback(async () => {
    const cityRes = await fetch("/api/profile/attribution-city");
    if (cityRes.status === 401) {
      setSignedIn(false);
      return false;
    }
    setSignedIn(true);
    if (cityRes.ok) {
      const json = (await cityRes.json()) as { attribution_city?: string | null };
      const city = json.attribution_city?.trim() ?? "";
      if (city) setAttributionCity(city);
    }
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        if (cancelled) return;
        await refreshAuth();
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshAuth]);

  async function ensureSignedIn(): Promise<boolean> {
    if (signedIn) return true;

    if (!email.trim() || !password) {
      setStatus("error");
      setMessage("Enter your email and password to leave a tip.");
      return false;
    }

    if (authMode === "signup") {
      if (password !== confirmPassword) {
        setStatus("error");
        setMessage("Passwords do not match");
        return false;
      }
      if (password.length < 6) {
        setStatus("error");
        setMessage("Password must be at least 6 characters");
        return false;
      }
      if (!attributionCity.trim()) {
        setStatus("error");
        setMessage("Enter the city you’re from");
        return false;
      }

      const result = await signUpAction(email, password, attributionCity);
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        posthog.capture("user_sign_up_failed", { error_message: result.error });
        return false;
      }
      if (result.user) {
        await identifyPostHogUserAndWaitForFlags(result.user);
      }
      posthog.capture("user_signed_up", { method: "email", source: "community_tip" });
    } else {
      const result = await signInWithPasswordAction(email, password);
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        posthog.capture("user_sign_in_failed", { error_message: result.error });
        return false;
      }
      if (result.user) {
        await identifyPostHogUserAndWaitForFlags(result.user);
      }
      posthog.capture("user_signed_in", { method: "email", source: "community_tip" });
    }

    const ok = await refreshAuth();
    if (!ok) {
      setStatus("error");
      setMessage(
        authMode === "signup"
          ? "Account created — check your email to confirm, then sign in here to submit your tip."
          : "Signed in, but session is not ready yet. Try again.",
      );
      return false;
    }
    return true;
  }

  async function submitTip() {
    const stars = rating === "" ? null : Number(rating);
    const res = await fetch("/api/community-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        body,
        rating: stars,
        attribution_city: attributionCity || null,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error || "Could not submit.");
      return false;
    }
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const authed = await ensureSignedIn();
      if (!authed) return;

      if (!attributionCity.trim()) {
        setStatus("error");
        setMessage("Enter the city you’re from");
        return;
      }

      const submitted = await submitTip();
      if (!submitted) return;

      setStatus("ok");
      setMessage("Thanks — your tip is waiting for review before it appears publicly.");
      setBody("");
      setRating("");
      setPassword("");
      setConfirmPassword("");
      setShowForm(false);
      void refreshPublished();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not submit.");
    }
  }

  return (
    <section className="mt-10 border-t border-[var(--color-border)] pt-8 sm:mt-12">
      <h2 className="text-editorial-headline text-xl text-[var(--color-text)] sm:text-2xl">
        Visitor tips
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
        Helpful notes from people who’ve been — shown without usernames.
      </p>

      {tips.length > 0 ? (
        <ul className="mt-6 space-y-5">
          {tips.map((tip) => (
            <li key={tip.id} className="flex gap-3 border-b border-zinc-100 pb-5 last:border-0">
              <TipInitialsAvatar name={tip.attribution_name} city={tip.attribution_city} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  {tipAttributionSaid(tip.attribution_city, tip.attribution_name)}
                  {tip.rating != null ? (
                    <>
                      {" · "}
                      <TipStars rating={tip.rating} />
                    </>
                  ) : null}
                </p>
                <p className="mt-2 text-[var(--color-text)]">{tip.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No published tips yet for {entityTitle}.</p>
      )}

      <div className="mt-6">
        {signedIn === null ? null : showForm ? (
          <form onSubmit={submit} className="max-w-xl space-y-3">
            <label className="block text-sm text-zinc-600">
              Your tip
              <textarea
                required
                minLength={15}
                maxLength={2000}
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What should visitors know?"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              />
            </label>
            <label className="block text-sm text-zinc-600">
              Stars <span className="font-normal text-zinc-400">(optional)</span>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              >
                <option value="">No rating</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-zinc-600">
              City you’re from
              <input
                required
                value={attributionCity}
                onChange={(e) => setAttributionCity(e.target.value)}
                placeholder="e.g. Birmingham"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              />
              <span className="mt-1 block text-xs text-zinc-500">
                Shown as “Someone from …” — never your name.
              </span>
            </label>

            {signedIn === false ? (
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-800">
                  {authMode === "signup"
                    ? "Create a free account to submit"
                    : "Sign in to submit"}
                </p>
                <p className="text-xs text-zinc-500">
                  Stay on this page — we’ll submit your tip right after.
                </p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                />
                {authMode === "signup" ? (
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                  />
                ) : null}
                <p className="text-sm text-zinc-600">
                  {authMode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="font-medium text-teal-700 hover:underline"
                        onClick={() => {
                          setAuthMode("signin");
                          setMessage("");
                        }}
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      New here?{" "}
                      <button
                        type="button"
                        className="font-medium text-teal-700 hover:underline"
                        onClick={() => {
                          setAuthMode("signup");
                          setMessage("");
                        }}
                      >
                        Create an account
                      </button>
                    </>
                  )}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {status === "loading"
                  ? signedIn
                    ? "Submitting…"
                    : authMode === "signup"
                      ? "Creating account…"
                      : "Signing in…"
                  : signedIn
                    ? "Submit for review"
                    : authMode === "signup"
                      ? "Create account & submit tip"
                      : "Sign in & submit tip"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setMessage("");
                  setStatus("idle");
                }}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700"
              >
                Cancel
              </button>
            </div>
            {message ? (
              <p className={`text-sm ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>
                {message}
              </p>
            ) : null}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setStatus("idle");
              setMessage("");
            }}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Leave a tip
          </button>
        )}
        {status === "ok" && !showForm && message ? (
          <p className="mt-3 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>
    </section>
  );
}

export function CommunityTipsSection(props: Props) {
  return (
    <CommunityTipsGate>
      <CommunityTipsSectionInner {...props} />
    </CommunityTipsGate>
  );
}
