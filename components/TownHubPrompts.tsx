"use client";

import { useRouter } from "next/navigation";
import { PromptChips } from "@/components/home/PromptChips";

export function TownHubPrompts({ townName }: { townName: string }) {
  const router = useRouter();
  const prompts = [
    `Best coffee in ${townName}`,
    `Casual lunch in ${townName}`,
    `Date night near ${townName}`,
    `Kid-friendly dinner ${townName}`,
    `Quick bite after the beach in ${townName}`,
  ];
  return (
    <PromptChips
      prompts={prompts}
      onPick={(p) => router.push(`/?q=${encodeURIComponent(p)}`)}
    />
  );
}
