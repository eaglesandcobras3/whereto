import type { ReactNode } from "react";

/** Full-viewport chat shell on mobile (footer stays off-screen until user leaves /ask). */
export default function AskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col max-lg:fixed max-lg:inset-x-0 max-lg:top-[var(--site-header-offset-mobile)] max-lg:z-30 max-lg:h-[calc(100dvh-var(--site-header-offset-mobile))] max-lg:overflow-hidden max-lg:bg-background lg:contents">
      {children}
    </div>
  );
}
