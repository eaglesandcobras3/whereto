"use client";

import { useCallback, useEffect, useId, useState } from "react";

export type BusinessGalleryPhoto = {
  id: string;
  public_url: string;
  is_hero: boolean;
  alt?: string | null;
};

type Props = {
  photos: BusinessGalleryPhoto[];
  businessName: string;
};

export function BusinessPhotoGallery({ photos, businessName }: Props) {
  const titleId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const showPrev = useCallback(() => {
    setOpenIndex((i) => (i == null ? i : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);
  const showNext = useCallback(() => {
    setOpenIndex((i) => (i == null ? i : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (openIndex == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openIndex, close, showPrev, showNext]);

  if (photos.length === 0) return null;

  const openPhoto = openIndex != null ? photos[openIndex] : null;

  return (
    <section className="mt-8" aria-labelledby={titleId}>
      <h2 id={titleId} className="font-headline text-xl font-semibold text-zinc-900">
        Photos
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Tap a photo to view it larger. The main image is marked — that&apos;s what appears on cards.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block w-full overflow-hidden rounded-lg bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.public_url}
                alt={photo.alt || `${businessName} photo ${index + 1}`}
                className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
              {photo.is_hero ? (
                <span className="absolute left-2 top-2 bg-teal-900/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Main
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {openPhoto && openIndex != null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${businessName} photo gallery`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 text-sm font-medium text-white/90 hover:text-white"
          >
            Close
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-2 text-2xl text-white/90 hover:text-white sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 text-2xl text-white/90 hover:text-white sm:right-6"
              >
                ›
              </button>
            </>
          ) : null}
          <div
            className="relative max-h-[85vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={openPhoto.public_url}
              alt={openPhoto.alt || `${businessName} photo ${openIndex + 1}`}
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
            <p className="mt-3 text-center text-sm text-white/80">
              {openPhoto.is_hero ? "Main listing image · " : ""}
              {openIndex + 1} of {photos.length}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
