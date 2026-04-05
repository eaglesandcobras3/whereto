import Link from "next/link";

type Cat = { slug: string; name: string; href: string };

type Props = { categories: Cat[] };

export function CategoryGrid({ categories }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={c.href}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-medium text-zinc-800 shadow-sm hover:border-teal-300 hover:bg-teal-50/50"
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
