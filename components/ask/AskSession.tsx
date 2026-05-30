"use client";

import { useEffect, useState } from "react";
import { AskPageClient } from "@/components/ask/AskPageClient";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";

const SESSION_STORAGE_KEY = "w30a_ask_session";

type Props = {
  towns: ListBusinessTownOption[];
};

export function AskSession({ towns }: Props) {
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  useEffect(() => {
    let key = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(SESSION_STORAGE_KEY, key);
    }
    setSessionKey(key);
  }, []);

  if (!sessionKey) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
    );
  }

  return <AskPageClient towns={towns} sessionKey={sessionKey} />;
}
