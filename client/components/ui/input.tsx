import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex min-h-[44px] w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3.5 py-2.5 text-base leading-5 text-[var(--text-strong)] sm:text-sm placeholder:text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] focus-visible:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-[var(--status-critical)] aria-[invalid=true]:hover:border-[var(--status-critical)]",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
