import { AsyncLocalStorage } from "node:async_hooks";

type Store = { ok: true };

const als = new AsyncLocalStorage<Store>();

/**
 * Wrap work that may call directory APIs (Geoapify Places / Place Details).
 * Only authorized cron route handlers should use this, after `assertCronAuthorized`.
 */
export async function withDirectoryIngestionCronContext<T>(
  fn: () => Promise<T>,
): Promise<T> {
  return als.run({ ok: true }, fn);
}

/**
 * Thrown when Geoapify helpers run outside `withDirectoryIngestionCronContext`.
 */
export function assertDirectoryIngestionCronContext(): void {
  if (als.getStore()?.ok) return;
  throw new Error(
    "Directory ingestion API is restricted to authorized cron jobs (wrap the caller with withDirectoryIngestionCronContext).",
  );
}
