import { notFound } from "next/navigation";

/** Nested `/guide/foo/bar` paths are invalid — return 404 instead of hub redirect. */
export default function GuideCatchAll() {
  notFound();
}
