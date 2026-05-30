"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/** Site-wide discovery / starter prompt chip — matches `.discovery-chip` using shadcn Button. */
export function PromptChip({ children, onClick, disabled, className }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-auto max-w-full rounded-full px-4 py-2 text-left font-normal whitespace-normal shadow-premium-sm transition-premium-fast",
        "hover:border-primary/50 hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {children}
    </Button>
  );
}
