"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanEntitlements } from "@/lib/portal/entitlements";
import { PlanGate } from "@/components/portal/PlanGate";
import { useBusinessPhotosFeatureEnabled } from "@/lib/feature-flags-client-utils";

type PhotoRow = {
  id: string;
  public_url: string;
  status: string;
  is_hero: boolean;
  created_at: string;
};

type Props = {
  businessId: string;
  businessTitle: string;
};

export function PortalPhotosClient({ businessId, businessTitle }: Props) {
  const businessPhotosEnabled = useBusinessPhotosFeatureEnabled();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [uploadKind, setUploadKind] = useState<"main" | "additional">("additional");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/portal/businesses/${encodeURIComponent(businessId)}/photos`)
      .then(async (res) => {
        const j = (await res.json()) as {
          photos?: PhotoRow[];
          entitlements?: PlanEntitlements;
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        setPhotos(j.photos ?? []);
        setEntitlements(j.entitlements ?? null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (!businessPhotosEnabled) return;
    queueMicrotask(() => load());
  }, [load, businessPhotosEnabled]);

  const activeCount = photos.filter((p) => p.status === "pending" || p.status === "approved").length;
  const atLimit = entitlements ? activeCount >= entitlements.max_photos : false;
  const hasMain = photos.some((p) => p.is_hero && (p.status === "pending" || p.status === "approved"));

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Choose a photo to upload.");
      return;
    }

    setUploading(true);
    setErr(null);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("is_hero", uploadKind === "main" ? "true" : "false");

    const res = await fetch(`/api/portal/businesses/${encodeURIComponent(businessId)}/photos`, {
      method: "POST",
      body: fd,
    });
    const j = (await res.json()) as { error?: string };
    setUploading(false);

    if (!res.ok) {
      setErr(j.error ?? "Upload failed.");
      return;
    }

    if (fileRef.current) fileRef.current.value = "";
    setUploadKind("additional");
    load();
  }

  if (!businessPhotosEnabled) {
    return (
      <div>
        <Link
          href={`/portal/businesses/${encodeURIComponent(businessId)}`}
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          ← Edit listing
        </Link>
        <h1 className="font-headline mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">
          Photos for {businessTitle}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Business photo uploads are not enabled yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/portal"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
        >
          ← Dashboard
        </Link>
        <Link
          href={`/portal/businesses/${encodeURIComponent(businessId)}`}
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Edit listing
        </Link>
      </div>

      <h1 className="font-headline mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">
        Photos for {businessTitle}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Uploads are resized (max 1600px) and saved as WebP, then reviewed before they appear on your
        public listing. Mark one photo as the <strong>main image</strong> — that&apos;s what shows
        on discovery cards.
      </p>

      {entitlements ? (
        <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
          {activeCount} of {entitlements.max_photos} photo slots used
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-[var(--color-text-secondary)]">Loading photos…</p>
      ) : (
        <>
          {photos.length > 0 ? (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p) => (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <div className="relative aspect-[4/3] bg-[var(--color-surface-secondary)]">
                    <Image src={p.public_url} alt="" fill className="object-cover" sizes="320px" />
                    {p.is_hero ? (
                      <span className="absolute left-2 top-2 bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Main (card)
                      </span>
                    ) : null}
                  </div>
                  <div className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                    <span className="capitalize">{p.status}</span>
                    {p.is_hero ? " · main listing image" : " · additional"}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-[var(--color-text-secondary)]">No photos yet.</p>
          )}

          {atLimit ? (
            <PlanGate allowed={false} feature="More photos" businessId={businessId}>
              <span />
            </PlanGate>
          ) : (
            <form onSubmit={upload} className="mt-8 space-y-4 rounded-xl border border-[var(--color-border)] p-5">
              {err ? <p className="text-sm text-red-600">{err}</p> : null}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  Upload photo
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm"
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Photo type
                </legend>
                <label className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                  <input
                    type="radio"
                    name="upload_kind"
                    checked={uploadKind === "main"}
                    onChange={() => setUploadKind("main")}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-[var(--color-text-primary)]">Main image</span>
                    {" — "}shown on discovery cards
                    {hasMain ? " (replaces the previous main when approved)" : ""}
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                  <input
                    type="radio"
                    name="upload_kind"
                    checked={uploadKind === "additional"}
                    onChange={() => setUploadKind("additional")}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      Additional photo
                    </span>
                    {" — "}appears in the profile gallery
                  </span>
                </label>
              </fieldset>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Submit for review"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
