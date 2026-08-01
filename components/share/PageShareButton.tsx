"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Link2, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildPageSharePayload,
  buildShareEmailHref,
  canUseNativeShare,
  type PageSharePayload,
  type PageShareType,
} from "@/lib/share/page-share";
import {
  trackShareButtonClicked,
  trackShareCancelled,
  trackShareCompleted,
  type PageShareAnalyticsContext,
} from "@/lib/share/page-share-analytics";

type Props = {
  pageType: PageShareType;
  pageName: string;
  pageSlug: string;
  /** Canonical path only (e.g. `/town/seaside`) — query params are stripped. */
  path: string;
  pageId?: string | null;
  className?: string;
};

function isAbortError(err: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      err instanceof DOMException &&
      err.name === "AbortError") ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name: string }).name === "AbortError")
  );
}

/** Prefer public site URL; fall back to the live page origin (never localhost from SSR). */
function resolveShareOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://whereto30a.com";
}

function safeTrack(fn: () => void): void {
  try {
    fn();
  } catch {
    // Analytics must never block sharing.
  }
}

export function PageShareButton({
  pageType,
  pageName,
  pageSlug,
  path,
  pageId = null,
  className,
}: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  useEffect(() => {
    setNativeAvailable(canUseNativeShare());
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function shareContext(payload: PageSharePayload): PageShareAnalyticsContext {
    return {
      pageType,
      pageId,
      pageTitle: pageName,
      pageSlug,
      pageUrl: payload.url,
    };
  }

  function currentPayload(): PageSharePayload {
    return buildPageSharePayload({
      pageName,
      path,
      origin: resolveShareOrigin(),
    });
  }

  async function shareNative(payload: PageSharePayload) {
    const ctx = shareContext(payload);
    setPending(true);
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      safeTrack(() => trackShareCompleted(ctx, "native"));
    } catch (err) {
      if (isAbortError(err)) {
        safeTrack(() => trackShareCancelled(ctx));
        return;
      }
      // Native share failed — fall back to menu without throwing.
      setMenuOpen(true);
    } finally {
      setPending(false);
    }
  }

  async function onShareClick() {
    if (!nativeAvailable && menuOpen) {
      setMenuOpen(false);
      return;
    }

    const payload = currentPayload();
    const ctx = shareContext(payload);
    safeTrack(() => trackShareButtonClicked(ctx));

    if (canUseNativeShare()) {
      await shareNative(payload);
      return;
    }

    setMenuOpen(true);
  }

  async function onCopyLink() {
    const payload = currentPayload();
    const ctx = shareContext(payload);
    try {
      await navigator.clipboard.writeText(payload.url);
      setCopied(true);
      safeTrack(() => trackShareCompleted(ctx, "copy_link"));
      setMenuOpen(false);
    } catch {
      // Clipboard denied — keep menu open; do not surface a page error.
    }
  }

  function onEmailShare() {
    const payload = currentPayload();
    safeTrack(() => trackShareCompleted(shareContext(payload), "email"));
    setMenuOpen(false);
    window.location.href = buildShareEmailHref(payload);
  }

  return (
    <div ref={rootRef} className={className ? `relative ${className}` : "relative"}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void onShareClick()}
        aria-haspopup={nativeAvailable ? undefined : "menu"}
        aria-expanded={nativeAvailable ? undefined : menuOpen}
        aria-controls={!nativeAvailable && menuOpen ? menuId : undefined}
        aria-label={`Share ${pageName}`}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Share2 className="size-3.5" aria-hidden />
        )}
        {copied ? "Link copied" : "Share"}
      </Button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Share options"
          className="absolute right-0 top-full z-40 mt-1 min-w-[10.5rem] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-1 shadow-sm"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
            onClick={() => void onCopyLink()}
          >
            <Link2 className="size-3.5 shrink-0" aria-hidden />
            Copy Link
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
            onClick={onEmailShare}
          >
            <Mail className="size-3.5 shrink-0" aria-hidden />
            Email
          </button>
        </div>
      ) : null}
    </div>
  );
}
