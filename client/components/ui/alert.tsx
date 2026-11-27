import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm leading-5",
  {
    variants: {
      variant: {
        error:
          "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--text-primary)]",
        warning:
          "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--text-primary)]",
        success:
          "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--text-primary)]",
        info: "border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--text-primary)]",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

const ICON_COLORS = {
  error: "text-[var(--status-critical)]",
  warning: "text-[var(--status-warning)]",
  success: "text-[var(--status-success)]",
  info: "text-[var(--status-info)]",
} as const;

export type AlertTone = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

function AlertIcon({ variant }: { variant: AlertTone }) {
  const iconClass = cn("mt-0.5 h-4 w-4 shrink-0", ICON_COLORS[variant]);
  switch (variant) {
    case "error":
      return <AlertCircle className={iconClass} aria-hidden="true" />;
    case "warning":
      return <AlertTriangle className={iconClass} aria-hidden="true" />;
    case "success":
      return <CheckCircle2 className={iconClass} aria-hidden="true" />;
    case "info":
      return <Info className={iconClass} aria-hidden="true" />;
  }
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  hideIcon?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", hideIcon = false, children, ...props }, ref) => {
    const resolved: AlertTone = variant ?? "info";
    return (
      <div
        ref={ref}
        role={resolved === "error" ? "alert" : "status"}
        aria-live={resolved === "error" ? "assertive" : "polite"}
        className={cn(alertVariants({ variant: resolved }), className)}
        {...props}
      >
        {!hideIcon ? <AlertIcon variant={resolved} /> : null}
        <div className="min-w-0 flex-1 space-y-1">{children}</div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("font-semibold leading-5 text-[var(--text-strong)]", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-5 text-[var(--text-primary)]", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
