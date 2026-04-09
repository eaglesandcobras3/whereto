import { SignupForm } from "@/app/signup/signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = next && next.startsWith("/") && !next.startsWith("//") ? next : "/profile";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Create account</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign up to save your favorites and access personalized features.
      </p>
      <SignupForm nextPath={nextPath} />
    </div>
  );
}
