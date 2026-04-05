type Props = {
  className?: string;
  /** Pre-defined skeleton variants */
  variant?: "text" | "title" | "card" | "avatar" | "image" | "button";
  /** Number of skeleton items to render (for text lines) */
  count?: number;
};

const variantClasses: Record<NonNullable<Props["variant"]>, string> = {
  text: "h-4 w-full",
  title: "h-6 w-3/4",
  card: "h-48 w-full",
  avatar: "h-10 w-10 rounded-full",
  image: "h-32 w-full",
  button: "h-10 w-24",
};

export function SkeletonLoader({
  className = "",
  variant = "text",
  count = 1,
}: Props) {
  const baseClasses = variantClasses[variant];

  if (count === 1) {
    return (
      <div
        className={`skeleton ${baseClasses} ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${baseClasses} ${className}`}
          style={{
            width: variant === "text" && i === count - 1 ? "60%" : undefined,
          }}
        />
      ))}
    </div>
  );
}

/** Skeleton for a business card */
export function BusinessCardSkeleton() {
  return (
    <div className="min-w-[280px] max-w-sm shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm sm:min-w-[300px]">
      {/* Image placeholder */}
      <div className="skeleton h-24 rounded-none" />

      <div className="space-y-3 p-5">
        {/* Title and headline */}
        <div className="space-y-2">
          <SkeletonLoader variant="title" />
          <SkeletonLoader className="h-3 w-1/2" />
        </div>

        {/* Description */}
        <SkeletonLoader count={2} />

        {/* Tags */}
        <div className="flex gap-2">
          <SkeletonLoader className="h-5 w-16 rounded-full" />
          <SkeletonLoader className="h-5 w-20 rounded-full" />
          <SkeletonLoader className="h-5 w-14 rounded-full" />
        </div>

        {/* Links */}
        <div className="flex gap-4">
          <SkeletonLoader className="h-4 w-16" />
          <SkeletonLoader className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a town card */
export function TownCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm">
      {/* Image placeholder */}
      <div className="skeleton h-36 rounded-none" />

      <div className="space-y-3 p-5">
        <SkeletonLoader count={2} />
        <SkeletonLoader className="h-4 w-32" />
      </div>
    </div>
  );
}

/** Skeleton for a carousel section */
export function CarouselSkeleton({ itemCount = 4 }: { itemCount?: number }) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="space-y-1">
        <SkeletonLoader variant="title" className="w-48" />
        <SkeletonLoader className="h-3 w-64" />
      </div>

      {/* Cards */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: itemCount }).map((_, i) => (
          <BusinessCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the hero section */
export function HeroSkeleton() {
  return (
    <div className="space-y-6 py-12">
      <div className="space-y-4 text-center">
        <SkeletonLoader className="mx-auto h-3 w-24" />
        <SkeletonLoader className="mx-auto h-12 w-3/4 max-w-lg" />
        <SkeletonLoader className="mx-auto h-5 w-2/3 max-w-md" />
      </div>

      {/* Search bar */}
      <div className="mx-auto max-w-xl">
        <SkeletonLoader className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
