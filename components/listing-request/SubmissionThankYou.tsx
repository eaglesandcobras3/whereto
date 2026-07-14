type Props = {
  className?: string;
};

export function SubmissionThankYou({ className }: Props) {
  return (
    <div className={className}>
      <p className="font-headline text-base font-semibold text-[var(--color-text-primary)]">
        Thank you for being part of the WhereTo30A community!
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Our team personally reviews every submission before it goes live. If it&apos;s a new listing, we&apos;ll
        publish each location after approval. If you&apos;re updating an existing listing, approved changes go
        live on that page.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        We&apos;ll email you when your listing is live (or if we can&apos;t approve it). We may also reach out if we
        need more information.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Thank you for helping us build the most comprehensive guide and directory for 30A. We&apos;re glad
        you&apos;re here!
      </p>
    </div>
  );
}
