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
        Our team personally reviews every submission before it goes live or is connected to an existing
        listing. If your business is already in our directory, we&apos;ll help you claim it so you can
        verify the information and keep it current. If it&apos;s a new listing, we&apos;ll review it before
        publishing.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        We&apos;ll be in touch if we need any additional information.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Thank you for helping us build the most comprehensive guide and directory for 30A. We&apos;re glad
        you&apos;re here!
      </p>
    </div>
  );
}
