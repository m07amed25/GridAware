import React from "react";
import { CheckCircle2, ChevronRight, Circle, Dot } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Created" },
  { number: 2, label: "Verify email" },
  { number: 3, label: "Sign in" },
] as const;

export function VerificationStepper({
  currentStep,
}: {
  currentStep: 2 | 3;
}) {
  return (
    <nav aria-label="Account activation progress">
      <ol className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[var(--border-subtle)] pb-4">
        {STEPS.map((step, index) => {
          const isComplete = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          return (
            <React.Fragment key={step.number}>
              <li
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-xs whitespace-nowrap",
                  isCurrent &&
                    "bg-[var(--surface-2)] font-semibold text-[var(--text-strong)]",
                  isComplete && "font-medium text-[var(--status-success)]",
                  !isCurrent && !isComplete && "text-[var(--text-muted)]",
                )}
              >
                {isComplete ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                ) : isCurrent ? (
                  <Dot
                    className="h-4 w-4 shrink-0 text-[var(--color-yellow)]"
                    strokeWidth={4}
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>{step.label}</span>
              </li>
              {index < STEPS.length - 1 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-[var(--border-strong)]"
                  aria-hidden="true"
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
