"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  defaultExpandedSectionIds,
  expandedSectionSetsEqual,
  expandedSectionsStorageKey,
  parseStoredExpandedSectionIds,
  sectionIdsFromKey,
  serializeExpandedSectionIds,
} from "@/lib/hooks/expanded-section-storage";

const DESKTOP_QUERY = "(min-width: 1024px)";

export type UsePersistedExpandedSectionIdsOptions = {
  sectionIds: readonly string[];
  defaultExpandedCount?: number;
  /** When true (default), `defaultExpandedCount` applies only at lg+. */
  desktopOnlyDefaults?: boolean;
  /** Namespace when multiple section groups share one pathname. */
  storageScope?: string;
  /** Optional guard before treating a URL hash as a section id. */
  isValidHash?: (hash: string) => boolean;
  /** Runs after a hash-matched section is expanded (e.g. scroll into view). */
  onHashApplied?: (sectionId: string) => void;
};

export function usePersistedExpandedSectionIds({
  sectionIds,
  defaultExpandedCount = 0,
  desktopOnlyDefaults = true,
  storageScope,
  isValidHash,
  onHashApplied,
}: UsePersistedExpandedSectionIdsOptions) {
  const pathname = usePathname();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const hydratedRef = useRef(false);
  const onHashAppliedRef = useRef(onHashApplied);
  const isValidHashRef = useRef(isValidHash);

  useEffect(() => {
    onHashAppliedRef.current = onHashApplied;
    isValidHashRef.current = isValidHash;
  }, [onHashApplied, isValidHash]);

  const sectionIdsKey = sectionIds.join("\0");

  useEffect(() => {
    if (typeof window === "undefined") return;

    hydratedRef.current = false;

    const currentSectionIds = sectionIdsFromKey(sectionIdsKey);
    const storageKey = expandedSectionsStorageKey(pathname, storageScope);
    const stored = parseStoredExpandedSectionIds(
      sessionStorage.getItem(storageKey),
      currentSectionIds,
    );

    const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;

    let next: Set<string>;
    if (stored !== null) {
      next = stored;
    } else if (!desktopOnlyDefaults || isDesktop) {
      next = defaultExpandedSectionIds(currentSectionIds, defaultExpandedCount);
    } else {
      next = new Set();
    }

    const hash = window.location.hash.replace(/^#/, "");
    if (
      hash &&
      currentSectionIds.includes(hash) &&
      (!isValidHashRef.current || isValidHashRef.current(hash))
    ) {
      next = new Set([...next, hash]);
      requestAnimationFrame(() => {
        onHashAppliedRef.current?.(hash);
      });
    }

    queueMicrotask(() => {
      setExpandedIds((prev) => (expandedSectionSetsEqual(prev, next) ? prev : next));
      hydratedRef.current = true;
    });
  }, [
    pathname,
    sectionIdsKey,
    defaultExpandedCount,
    desktopOnlyDefaults,
    storageScope,
  ]);

  useEffect(() => {
    if (!hydratedRef.current || typeof window === "undefined") return;
    const storageKey = expandedSectionsStorageKey(pathname, storageScope);
    sessionStorage.setItem(storageKey, serializeExpandedSectionIds(expandedIds));
  }, [expandedIds, pathname, storageScope]);

  const setExpanded = useCallback((id: string, open: boolean) => {
    setExpandedIds((prev) => {
      if (open === prev.has(id)) return prev;
      const next = new Set(prev);
      if (open) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return { expandedIds, toggle, setExpanded };
}
