import { RentalCard } from "@/components/stays/RentalCard";
import type { RentalPropertyView } from "@/lib/stays/types";

type Props = {
  items: RentalPropertyView[];
  total: number;
};

export function StaysResults({ items, total }: Props) {
  if (items.length === 0) {
    return (
      <p className="mt-8 text-sm text-zinc-600">
        No published stays match these filters yet. Try fewer filters, or{" "}
        <a href="/list-your-rentals" className="font-medium text-teal-900 underline">
          partner with WhereTo30A
        </a>{" "}
        if you manage rentals on 30A.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-sm text-zinc-600">
        {total} stay{total === 1 ? "" : "s"} · Check availability with the local manager
      </p>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <RentalCard key={p.id} property={p} position={i + 1} />
        ))}
      </div>
    </div>
  );
}
