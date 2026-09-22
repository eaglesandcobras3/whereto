import { tipInitials } from "@/lib/community-tips/attribution";

const TONES = [
  "bg-teal-100 text-teal-800",
  "bg-zinc-200 text-zinc-700",
  "bg-amber-100 text-amber-900",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
  "bg-emerald-100 text-emerald-800",
] as const;

function toneClass(initials: string): string {
  let n = 0;
  for (const ch of initials) n += ch.charCodeAt(0);
  return TONES[n % TONES.length];
}

type Props = {
  name?: string | null;
  city?: string | null;
  className?: string;
};

/** Letter circle only — planted tips never use a photo. */
export function TipInitialsAvatar({ name, city, className = "" }: Props) {
  const initials = tipInitials(name, city);
  return (
    <span
      aria-hidden
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide ${toneClass(initials)} ${className}`}
    >
      {initials}
    </span>
  );
}
