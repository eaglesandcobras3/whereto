import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Set new password</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your new password below.
      </p>
      <ResetPasswordForm />
    </div>
  );
}
