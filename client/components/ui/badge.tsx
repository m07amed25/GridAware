import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2 py-0.5 text-xs font-semibold leading-4 whitespace-nowrap transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-primary)]",
        secondary:
          "border-[var(--border-subtle)] bg-[var(--surface-3)] text-[var(--text-secondary)]",
        success:
          "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]",
        warning:
          "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
        critical:
          "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical)]",
        info: "border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info)]",
        simulated:
          "border-[rgba(252,206,53,0.45)] bg-[rgba(252,206,53,0.12)] text-[var(--accent-gold-ink)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
