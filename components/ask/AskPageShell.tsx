"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AskSession } from "@/components/ask/AskSession";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { fetchPublicTowns } from "@/lib/public/fetch-public-towns-client";

export function AskPageShell() {
  const searchParams = useSearchParams();
  const [towns, setTowns] = useState<ListBusinessTownOption[]>([]);
  const [ready, setReady] = useState(false);

  const rawQ = searchParams.get("q");
  const initialQuery = rawQ?.trim() || undefined;

  useEffect(() => {
    const controller = new AbortController();
    void fetchPublicTowns(controller.signal)
      .then((rows) => {
        setTowns(rows);
        setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTowns([]);
          setReady(true);
        }
      });
    return () => controller.abort();
  }, []);

  if (!ready) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
    );
  }

  return <AskSession towns={towns} initialQuery={initialQuery} />;
}
