import type { ReactNode } from "react";
import { PlacePageIntro } from "@/components/place/PlacePageIntro";

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  portraitUrl?: string | null;
  portraitAlt: string;
  fallbackIcon?: string;
  meta?: ReactNode;
};

export function PlacePageHeader({
  eyebrow,
  title,
  intro,
  portraitUrl,
  portraitAlt,
  fallbackIcon = "location_city",
  meta,
}: Props) {
  return (
    <header className="mb-6 sm:mb-10">
      <div className="flex items-start gap-4 sm:gap-6">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:aspect-[2/3] sm:h-auto sm:w-36 md:w-44">
          {portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portraitUrl} alt={portraitAlt} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <span className="material-symbols-outlined !text-3xl sm:!text-4xl" aria-hidden>
                {fallbackIcon}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-[var(--color-primary)] sm:text-xs">
            {eyebrow}
          </p>
          <h1 className="text-editorial-headline mt-1 text-2xl text-zinc-900 sm:mt-2 sm:text-3xl md:text-4xl">
            {title}
          </h1>
          {meta}
          <PlacePageIntro text={intro} className="mt-2 sm:mt-3" />
        </div>
      </div>
    </header>
  );
}
