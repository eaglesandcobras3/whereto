type Props = { tags: string[]; max?: number };

export function TagPills({ tags, max = 8 }: Props) {
  const slice = tags.slice(0, max);
  if (!slice.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {slice.map((t) => (
        <span
          key={t}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
        >
          {t.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}
