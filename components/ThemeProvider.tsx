"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "whereto30a-theme";

/**
 * App visual design (design/homepage.html) is light-only. We always apply the
 * light token set on <html> so CSS variables match the design; dark preference
 * is not applied until a dark design exists.
 */
function applyLightDocumentClass() {
  const root = document.documentElement;
  root.classList.remove("dark");
  root.classList.add("light");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    queueMicrotask(() => {
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeState(stored);
      }
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    applyLightDocumentClass();
    queueMicrotask(() => {
      setResolvedTheme("light");
    });
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyLightDocumentClass();
      setResolvedTheme("light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{ theme: "light", resolvedTheme: "light", setTheme }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
