"use client";

import { useCallback, useId, useState } from "react";
import { pointInDiscoverLocateEnvelope } from "@/lib/discovery-filters/discover-bbox";

type Props = {
  onLocate: (lat: number, lng: number) => void;
};

type PendingLocate = { lat: number; lng: number };

function readGeolocationErrorMessage(code: number): string {
  if (code === 1) return "Location permission was denied.";
  if (code === 2) return "Location is unavailable right now.";
  if (code === 3) return "Location request timed out.";
  return "Could not read your location.";
}

export function DiscoverLocateControl({ onLocate }: Props) {
  const dialogTitleId = useId();
  const [pending, setPending] = useState(false);
  const [outsideModal, setOutsideModal] = useState<PendingLocate | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setNotice(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNotice("Location is unavailable in this browser.");
      return;
    }

    setPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPending(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setNotice("Could not read your location.");
          return;
        }
        if (pointInDiscoverLocateEnvelope(lat, lng)) {
          onLocate(lat, lng);
          return;
        }
        setOutsideModal({ lat, lng });
      },
      (error) => {
        setPending(false);
        setNotice(readGeolocationErrorMessage(error.code));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }, [onLocate]);

  const confirmOutsideLocate = useCallback(() => {
    if (!outsideModal) return;
    onLocate(outsideModal.lat, outsideModal.lng);
    setOutsideModal(null);
  }, [onLocate, outsideModal]);

  return (
    <>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[510] flex flex-col items-end gap-2">
        {notice ? (
          <div
            role="status"
            className="pointer-events-auto flex max-w-[min(100vw-1.5rem,16rem)] items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-2 text-xs text-[var(--color-text-secondary)] shadow-md backdrop-blur-md"
          >
            <p className="min-w-0 flex-1 leading-snug">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 rounded p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined !text-base" aria-hidden>
                close
              </span>
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={requestLocation}
          disabled={pending}
          aria-label="Use current location"
          title="Use current location"
          className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 text-[var(--color-primary)] shadow-md backdrop-blur-md hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
        >
          <span
            className={`material-symbols-outlined !text-[22px] ${pending ? "animate-pulse" : ""}`}
            aria-hidden
          >
            {pending ? "progress_activity" : "my_location"}
          </span>
        </button>
      </div>

      {outsideModal ? (
        <div
          className="fixed inset-0 z-[600] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOutsideModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative w-full max-w-md rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 shadow-lg sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={dialogTitleId}
              className="font-headline text-lg font-semibold leading-snug text-[var(--color-text-primary)]"
            >
              You&apos;re outside the local area
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Your location looks outside Destin through Panama City Beach. Most storefront pins
              sit along 30A, so this view may have few results.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOutsideModal(null)}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Close
              </button>
              <button
                type="button"
                onClick={confirmOutsideLocate}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
              >
                Go to my location
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
