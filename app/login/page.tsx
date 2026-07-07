import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign in to access saves, admin features, and personalized results.
      </p>
      <LoginForm />
    </div>
  );
}
