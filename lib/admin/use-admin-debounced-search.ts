"use client";

import { useEffect, useRef, useState } from "react";
import { ADMIN_SEARCH_DEBOUNCE_MS } from "@/lib/admin/admin-search-debounce";

type Options = {
  query: string;
  /** Minimum trimmed length before searching (default 2). */
  minLength?: number;
  debounceMs?: number;
  onSearch: (trimmedQuery: string, signal: AbortSignal) => Promise<void>;
  onClear?: () => void;
  onDebouncedQuery?: (trimmedQuery: string) => void;
};

/**
 * Debounced admin search: waits until typing pauses, aborts stale requests,
 * and exposes an awaiting-debounce flag for the UI.
 */
export function useAdminDebouncedSearch({
  query,
  minLength = 2,
  debounceMs = ADMIN_SEARCH_DEBOUNCE_MS,
  onSearch,
  onClear,
  onDebouncedQuery,
}: Options) {
  const trimmed = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmed);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [trimmed, debounceMs]);

  useEffect(() => {
    onDebouncedQuery?.(debouncedQuery);
  }, [debouncedQuery, onDebouncedQuery]);

  useEffect(() => {
    if (debouncedQuery.length < minLength) {
      setLoading(false);
      onClear?.();
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setLoading(true);

    void (async () => {
      try {
        await onSearch(debouncedQuery, controller.signal);
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, minLength, onClear, onSearch]);

  const awaitingDebounce = trimmed.length >= minLength && trimmed !== debouncedQuery;

  return {
    loading: loading || awaitingDebounce,
    awaitingDebounce,
    debouncedQuery,
  };
}
