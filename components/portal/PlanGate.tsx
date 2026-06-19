import Link from "next/link";

type Props = {
  allowed: boolean;
  feature: string;
  businessId?: string;
  children: React.ReactNode;
};

export function PlanGate({ allowed, feature, businessId, children }: Props) {
  if (allowed) return <>{children}</>;

  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)] px-4 py-5">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">
        {feature} is included with Local Partner
      </p>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Upgrade to unlock hours, social links, a longer description, and more photos ($99/year).
      </p>
      <Link
        href={
          businessId
            ? `/portal/billing?business_id=${encodeURIComponent(businessId)}`
            : "/portal/billing"
        }
        className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline"
      >
        View plans and upgrade
      </Link>
    </div>
  );
}
