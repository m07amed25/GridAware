"use client";

import React from "react";
import { Archive, CheckCircle2, PauseCircle } from "lucide-react";
import type { LocationStatus } from "@/lib/locations/types";
import { cn } from "@/lib/utils";

/**
 * Operational location status badge (never conveys equipment health and never
 * relies on color alone — pairs icon + explicit text label).
 */
export function LocationStatusBadge({
  status,
  archivedAt,
  className,
}: {
  status: LocationStatus;
  archivedAt: string | null;
  className?: string;
}) {
  if (archivedAt !== null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-3)] px-2.5 py-0.5 text-xs font-medium text-[var(--status-offline)]",
          className,
        )}
      >
        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Archived</span>
      </span>
    );
  }

  if (status === "ACTIVE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--status-success)]",
          className,
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Active</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--status-warning)]",
        className,
      )}
    >
      <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Inactive</span>
    </span>
  );
}
