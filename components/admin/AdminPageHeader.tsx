import Link from "next/link";

export function AdminPageHeader({
  title,
  description,
  backHref = "/admin",
  backLabel = "Admin",
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <>
      <p className="text-sm">
        <Link href={backHref} className="font-medium text-zinc-600 hover:text-zinc-900">
          ← {backLabel}
        </Link>
      </p>
      <h1 className="mt-3 font-headline text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
    </>
  );
}
