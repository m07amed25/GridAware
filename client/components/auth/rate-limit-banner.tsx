"use client";

import React from "react";
import { Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function RateLimitBanner({
  actionLabel,
  remainingSeconds,
}: {
  actionLabel: string;
  remainingSeconds: number;
}) {
  if (remainingSeconds <= 0) {
    return null;
  }

  return (
    <Alert variant="warning">
      <AlertTitle>Temporary rate limit active</AlertTitle>
      <AlertDescription className="space-y-1.5">
        <p>Too many {actionLabel} attempts from this connection or account.</p>
        <p className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-[var(--status-warning)]">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Try again in {remainingSeconds}{" "}
            {remainingSeconds === 1 ? "second" : "seconds"}
          </span>
        </p>
      </AlertDescription>
    </Alert>
  );
}
