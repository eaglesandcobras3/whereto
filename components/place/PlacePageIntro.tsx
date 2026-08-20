import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
};

/** Full hero intro on town/area pages — no mobile clamp / “Read more”. */
export function PlacePageIntro({ text, className }: Props) {
  return (
    <p
      className={cn(
        "text-left text-sm leading-relaxed text-zinc-500 sm:text-[0.9375rem] md:text-base",
        className,
      )}
    >
      {text}
    </p>
  );
}
