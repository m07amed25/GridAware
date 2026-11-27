"use client";

import React, { useState } from "react";
import { AlertCircle, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface AuthFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  labelAction?: React.ReactNode;
  hint?: string;
  error?: string;
  showCapsLockWarning?: boolean;
}

export function AuthField({
  id,
  label,
  labelAction,
  hint,
  error,
  type,
  required,
  showCapsLockWarning = false,
  className,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const capsId =
    isPassword && showCapsLockWarning && capsLockOn ? `${id}-caps` : undefined;
  const describedBy =
    [hintId, capsId, errorId].filter(Boolean).join(" ") || undefined;

  function syncCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    if (isPassword && showCapsLockWarning && typeof event.getModifierState === "function") {
      setCapsLockOn(event.getModifierState("CapsLock"));
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="inline-flex items-center gap-1">
          <span>{label}</span>
          {required ? (
            <span className="text-[var(--text-muted)]" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
        {labelAction}
      </div>

      <div className="relative">
        <Input
          id={id}
          type={effectiveType}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(isPassword && "pe-12", className)}
          onKeyDown={(event) => {
            syncCapsLock(event);
            onKeyDown?.(event);
          }}
          onKeyUp={(event) => {
            syncCapsLock(event);
            onKeyUp?.(event);
          }}
          onBlur={(event) => {
            setCapsLockOn(false);
            onBlur?.(event);
          }}
          {...rest}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide passphrase" : "Show passphrase"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 end-0 inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-e-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)]"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      {capsId ? (
        <p
          id={capsId}
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--status-warning)]"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Caps Lock is on. Passphrases are case-sensitive.</span>
        </p>
      ) : null}

      {hint ? (
        <p id={hintId} className="text-xs leading-4 text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-xs font-medium leading-4 text-[var(--status-critical)]"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
