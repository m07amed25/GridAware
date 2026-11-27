"use client";

import React from "react";

export type BannerTone = "error" | "warning" | "success" | "info";

function ToneIcon({ tone }: { tone: BannerTone }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 20 20",
    fill: "none",
    "aria-hidden": true as const,
    className: "shrink-0 mt-0.5",
  };

  switch (tone) {
    case "error":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.75" />
          <path d="M10 6.2V10.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="10" cy="13.5" r="1" fill="currentColor" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path
            d="M10 3.2L17.2 16H2.8L10 3.2Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M10 8V11.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="10" cy="13.8" r="0.9" fill="currentColor" />
        </svg>
      );
    case "success":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M6.8 10.2L9 12.4L13.4 7.8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.75" />
          <path d="M10 9.2V13.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="10" cy="6.6" r="1" fill="currentColor" />
        </svg>
      );
  }
}

const TONE_STYLES: Record<BannerTone, string> = {
  error:
    "border-[var(--status-critical)] bg-[var(--status-critical-bg)] text-[var(--text-strong)]",
  warning:
    "border-[var(--status-warning)] bg-[var(--status-warning-bg)] text-[var(--text-strong)]",
  success:
    "border-[var(--status-success)] bg-[var(--status-success-bg)] text-[var(--text-strong)]",
  info: "border-[var(--status-info)] bg-[var(--status-info-bg)] text-[var(--text-strong)]",
};

const ICON_COLOR: Record<BannerTone, string> = {
  error: "text-[var(--status-critical)]",
  warning: "text-[var(--status-warning)]",
  success: "text-[var(--status-success)]",
  info: "text-[var(--status-info)]",
};

export function AuthAlertBanner({
  tone,
  title,
  children,
}: {
  tone: BannerTone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-sm leading-5 ${TONE_STYLES[tone]}`}
    >
      <span className={ICON_COLOR[tone]}>
        <ToneIcon tone={tone} />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold text-[var(--text-strong)]">{title}</p> : null}
        <div className="text-[var(--text-primary)]">{children}</div>
      </div>
    </div>
  );
}

export interface AuthFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function AuthField({
  id,
  label,
  hint,
  error,
  className = "",
  ...rest
}: AuthFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[var(--text-primary)]"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`w-full min-h-[44px] rounded-[var(--radius-control)] border bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-lime)] ${
          error
            ? "border-[var(--status-critical)]"
            : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
        } ${className}`}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="text-xs leading-4 text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--status-critical)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.75" />
            <path d="M10 6.2V10.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="10" cy="13.5" r="1" fill="currentColor" />
          </svg>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "destructive";

export interface AuthButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-yellow)] text-[var(--color-black)] font-semibold hover:bg-[var(--color-lime)] active:bg-[var(--color-gold)]",
  secondary:
    "border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-primary)] font-medium hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]",
  destructive:
    "border border-[var(--status-critical)] bg-[var(--status-critical-bg)] text-[var(--text-strong)] font-medium hover:bg-[rgba(240,106,106,0.22)]",
};

export function AuthButton({
  variant = "primary",
  loading = false,
  loadingLabel,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="animate-spin"
          >
            <circle
              cx="10"
              cy="10"
              r="7"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="2.2"
            />
            <path
              d="M10 3a7 7 0 0 1 7 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
