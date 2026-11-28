import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer motion-reduce:transform-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-yellow)] text-[var(--color-black)] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:-translate-y-[1px] hover:bg-[var(--brand-primary-hover)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)] active:translate-y-0 active:bg-[var(--brand-primary-active)] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]",
        secondary:
          "border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)] hover:text-[var(--text-strong)] active:bg-[var(--surface-4)]",
        outline:
          "border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text-strong)] active:bg-[var(--surface-3)]",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-strong)] active:bg-[var(--surface-4)]",
        destructive:
          "border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical)] font-medium hover:border-[var(--status-critical-hover)] hover:bg-[var(--status-critical-hover)] hover:text-[var(--destructive-foreground)] active:bg-[var(--status-critical-active)] active:text-[var(--destructive-foreground)]",
        destructiveSolid:
          "bg-[var(--status-critical)] text-[var(--destructive-foreground)] font-semibold hover:-translate-y-[1px] hover:bg-[var(--status-critical-hover)] active:translate-y-0 active:bg-[var(--status-critical-active)]",
        link: "min-h-0 px-0 py-0 text-[var(--accent-ink)] underline-offset-4 hover:text-[var(--accent-ink)] hover:underline",
      },
      size: {
        default: "min-h-[44px] px-4 py-2.5",
        sm: "min-h-[36px] px-3 py-1.5 text-[13px]",
        lg: "min-h-[48px] px-5 py-3 text-sm",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingLabel,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{loadingLabel ?? children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
