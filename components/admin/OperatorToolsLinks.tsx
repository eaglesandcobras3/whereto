import Link from "next/link";
import type { AdminNavItem } from "@/lib/admin/admin-nav";

type Props = {
  items: AdminNavItem[];
};

export function OperatorToolsLinks({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="block px-4 py-4 transition-colors hover:bg-zinc-50 sm:px-5"
          >
            <span className="font-medium text-zinc-900">{item.title}</span>
            <span className="mt-0.5 block text-sm text-zinc-500">{item.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
