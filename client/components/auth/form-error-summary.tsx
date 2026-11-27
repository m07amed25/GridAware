"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FormErrorItem } from "@/lib/auth/auth-validation";

export interface FormErrorSummaryProps {
  errors: FormErrorItem[];
  summaryRef?: React.RefObject<HTMLDivElement | null>;
}

export function FormErrorSummary({
  errors,
  summaryRef,
}: FormErrorSummaryProps) {
  if (errors.length < 2) {
    return null;
  }

  return (
    <Alert
      ref={summaryRef}
      variant="error"
      tabIndex={-1}
      className="focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
    >
      <AlertTitle>Review {errors.length} fields before continuing</AlertTitle>
      <AlertDescription>
        <ul className="mt-1.5 list-disc space-y-1 ps-4 text-xs leading-5">
          {errors.map((item) => (
            <li key={item.fieldId}>
              <a
                href={`#${item.fieldId}`}
                onClick={(event) => {
                  event.preventDefault();
                  const el = document.getElementById(item.fieldId);
                  el?.focus();
                }}
                className="font-medium text-[var(--text-strong)] underline underline-offset-4 hover:text-[var(--color-yellow)]"
              >
                {item.fieldName}
              </a>
              <span className="text-[var(--text-primary)]">
                : {item.message}
              </span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
