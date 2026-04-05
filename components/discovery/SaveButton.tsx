"use client";

import { useState } from "react";

type Props = {
  businessId: string;
  onSave: (id: string) => void | Promise<void>;
  /** Initial saved state */
  initialSaved?: boolean;
  /** Show label text */
  showLabel?: boolean;
  /** Size variant */
  size?: "sm" | "md";
};

export function SaveButton({
  businessId,
  onSave,
  initialSaved = false,
  showLabel = false,
  size = "md",
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [animating, setAnimating] = useState(false);

  async function handleClick() {
    if (saved) return; // Don't unsave for now

    setAnimating(true);
    setSaved(true);

    try {
      await onSave(businessId);
    } catch {
      // Revert on error
      setSaved(false);
    }

    // Reset animation
    setTimeout(() => setAnimating(false), 350);
  }

  const sizeClasses = size === "sm" ? "h-8 px-2 gap-1" : "h-9 px-3 gap-1.5";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={`
        inline-flex items-center justify-center
        rounded-lg border
        text-sm font-medium
        transition-premium-fast
        ${sizeClasses}
        ${
          saved
            ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-700 dark:hover:bg-rose-900/20"
        }
      `}
      aria-label={saved ? "Saved" : "Save"}
      aria-pressed={saved}
    >
      <svg
        className={`
          ${iconSize}
          transition-transform
          ${animating ? "heart-animate" : ""}
          ${saved ? "fill-current" : ""}
        `}
        fill={saved ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={saved ? 0 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {showLabel && (
        <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
      )}
    </button>
  );
}
