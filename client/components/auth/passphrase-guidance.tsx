"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  MAX_PASSPHRASE_LENGTH,
  type PassphraseAssessment,
} from "@/lib/auth/passphrase-policy";
import { cn } from "@/lib/utils";

const INDICATOR_CLASSES: Record<PassphraseAssessment["strengthTier"], string> = {
  empty: "bg-[var(--border-default)]",
  "too-short": "bg-[var(--status-critical)]",
  fair: "bg-[var(--status-warning)]",
  strong: "bg-[var(--status-info)]",
  "very-strong": "bg-[var(--status-success)]",
};

const LABEL_CLASSES: Record<PassphraseAssessment["strengthTier"], string> = {
  empty: "text-[var(--text-muted)]",
  "too-short": "text-[var(--status-critical)]",
  fair: "text-[var(--status-warning)]",
  strong: "text-[var(--status-info)]",
  "very-strong": "text-[var(--status-success)]",
};

export function PassphraseGuidance({
  assessment,
  id,
}: {
  assessment: PassphraseAssessment;
  id?: string;
}) {
  const {
    length,
    minLengthMet,
    maxLengthMet,
    strengthTier,
    strengthLabel,
    strengthScore,
    guidance,
  } = assessment;

  return (
    <div id={id} className="space-y-2 pt-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--text-secondary)]">
          Passphrase strength
          {strengthLabel ? (
            <>
              :{" "}
              <span className={cn("font-semibold", LABEL_CLASSES[strengthTier])}>
                {strengthLabel}
              </span>
            </>
          ) : null}
        </span>
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            !maxLengthMet
              ? "font-semibold text-[var(--status-critical)]"
              : minLengthMet
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)]",
          )}
        >
          {length} / {MAX_PASSPHRASE_LENGTH}
        </span>
      </div>

      <Progress
        value={strengthScore}
        aria-label="Passphrase strength"
        aria-valuetext={
          strengthLabel
            ? `${strengthLabel} (${length} of ${MAX_PASSPHRASE_LENGTH} characters)`
            : "No passphrase entered"
        }
        indicatorClassName={INDICATOR_CLASSES[strengthTier]}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium",
            !maxLengthMet
              ? "text-[var(--status-critical)]"
              : minLengthMet
                ? "text-[var(--status-success)]"
                : "text-[var(--text-muted)]",
          )}
        >
          {!maxLengthMet ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : minLengthMet ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>12–128 characters</span>
        </span>
        <span className="text-[var(--text-muted)]">{guidance}</span>
      </div>
    </div>
  );
}
