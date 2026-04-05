"use client";

import { useTheme } from "@/components/ThemeProvider";

type Props = {
  className?: string;
};

export function ThemeToggle({ className = "" }: Props) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  function cycleTheme() {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  }

  const label =
    theme === "system"
      ? "System theme"
      : theme === "dark"
        ? "Dark mode"
        : "Light mode";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] transition-premium-fast hover:bg-[var(--color-surface-secondary)] focus-ring ${className}`}
      aria-label={`Toggle theme (currently ${label})`}
      title={label}
    >
      {/* Sun icon (light mode) */}
      <svg
        className={`absolute h-5 w-5 transition-all duration-200 ${
          resolvedTheme === "light"
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon icon (dark mode) */}
      <svg
        className={`absolute h-5 w-5 transition-all duration-200 ${
          resolvedTheme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>

      {/* System indicator (small dot when in system mode) */}
      {theme === "system" ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
      ) : null}
    </button>
  );
}
