import "server-only";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export async function logSecurityEvent(opts: {
  eventType: string;
  ipKey?: string;
  path?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    console.warn("[security]", opts.eventType, opts.payload);
    return;
  }
  try {
    await supabase.from("security_events").insert({
      event_type: opts.eventType,
      ip_key: opts.ipKey ?? null,
      path: opts.path ?? null,
      payload: opts.payload ?? {},
    });
  } catch (e) {
    console.error("[security] log failed", e);
  }
}
