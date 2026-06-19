"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanEntitlements } from "@/lib/portal/entitlements";
import { PlanGate } from "@/components/portal/PlanGate";

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [isHero, setIsHero] = useState(false);
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
    load();
  }, [load]);

  const activeCount = photos.filter((p) => p.status === "pending" || p.status === "approved").length;
  const atLimit = entitlements ? activeCount >= entitlements.max_photos : false;

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
    fd.set("is_hero", isHero ? "true" : "false");

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
    setIsHero(false);
    load();
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
        Uploaded photos are reviewed before they appear on your public listing.
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
                  </div>
                  <div className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                    <span className="capitalize">{p.status}</span>
                    {p.is_hero ? " · hero" : ""}
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
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={isHero}
                  onChange={(e) => setIsHero(e.target.checked)}
                />
                Use as main listing photo when approved
              </label>
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
