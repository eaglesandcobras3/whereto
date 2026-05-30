"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { artifactShareTitle } from "@/lib/ask/shareArtifacts";
import type { AskArtifact } from "@/lib/ask/types";

type Props = {
  artifact: AskArtifact | undefined;
  artifactSessionId?: string;
  shareableSummary?: string;
};

export function ShareArtifactButton({
  artifact,
  artifactSessionId,
  shareableSummary,
}: Props) {
  const [pending, setPending] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"summary" | "link" | null>(null);

  const shareable =
    artifact?.type === "business_results" ||
    artifact?.type === "guide_results" ||
    artifact?.type === "town_results" ||
    artifact?.type === "area_results";

  if (!artifact || !shareable) {
    return null;
  }

  async function createShare() {
    if (!artifact) return;
    setPending(true);
    try {
      const res = await fetch("/api/ask/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact, artifactSessionId }),
      });
      const data = (await res.json()) as { url?: string; summary?: string };
      if (data.url) {
        setShareUrl(data.url);
        if (navigator.share) {
          await navigator.share({
            title: artifactShareTitle(artifact),
            text: data.summary ?? shareableSummary,
            url: data.url,
          });
        }
      }
    } finally {
      setPending(false);
    }
  }

  async function copySummary() {
    const text = shareableSummary ?? "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied("summary");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyLink() {
    if (!shareUrl) {
      await createShare();
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" type="button" disabled={pending} onClick={copySummary}>
        {copied === "summary" ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Share2 className="size-3.5" aria-hidden />
        )}
        {copied === "summary" ? "Copied" : "Copy summary"}
      </Button>
      <Button variant="outline" size="sm" type="button" disabled={pending} onClick={copyLink}>
        {copied === "link" ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Link2 className="size-3.5" aria-hidden />
        )}
        {copied === "link" ? "Copied" : "Copy link"}
      </Button>
      <Button variant="default" size="sm" type="button" disabled={pending} onClick={createShare}>
        Share
      </Button>
    </div>
  );
}
