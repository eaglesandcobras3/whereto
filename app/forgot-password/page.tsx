import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Reset password</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
