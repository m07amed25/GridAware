"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import {
  AuthAlertBanner,
  AuthButton,
  AuthField,
} from "@/components/auth/auth-primitives";
import { ApiClientError, apiRequest } from "@/lib/auth/client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [banner, setBanner] = useState<{
    tone: "error" | "warning" | "success";
    message: string;
  } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(undefined);
    setBanner(null);

    if (!token) {
      setBanner({
        tone: "error",
        message: "Missing reset token. Request a new password reset link.",
      });
      return;
    }

    if (
      Array.from(newPassword).length < 12 ||
      Array.from(newPassword).length > 128
    ) {
      setFieldError("Passphrase must be between 12 and 128 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<{ reset: true }>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setCompleted(true);
      setBanner({
        tone: "success",
        message:
          "Your passphrase has been updated and all existing sessions have been signed out.",
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "RATE_LIMITED") {
        const waitText = err.retryAfterSeconds
          ? ` Try again in ${err.retryAfterSeconds} seconds.`
          : "";
        setBanner({
          tone: "warning",
          message: `Too many reset attempts.${waitText}`,
        });
      } else {
        setBanner({
          tone: "error",
          message:
            err instanceof Error
              ? err.message
              : "This reset link is invalid, expired, or has already been used.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
          Choose a new passphrase
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Setting a new passphrase signs out all active sessions across your
          devices.
        </p>
      </div>

      {banner ? (
        <AuthAlertBanner tone={banner.tone}>{banner.message}</AuthAlertBanner>
      ) : null}

      {completed ? (
        <Link
          href="/login"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-yellow)] px-4 py-2.5 text-sm font-semibold text-[var(--color-black)] hover:bg-[var(--color-lime)]"
        >
          Sign in with new passphrase
        </Link>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <AuthField
            id="reset-new-password"
            name="newPassword"
            type="password"
            label="New passphrase"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="Use 12 to 128 characters."
            error={fieldError}
          />

          <AuthButton
            type="submit"
            variant="primary"
            loading={submitting}
            loadingLabel="Updating passphrase..."
            className="w-full"
          >
            Update passphrase
          </AuthButton>
        </form>
      )}

      <p className="text-center text-sm text-[var(--text-secondary)]">
        <Link
          href="/forgot-password"
          className="font-medium text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--color-lime)]"
        >
          Request a new reset link
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-7 w-48 rounded bg-[var(--surface-2)]" />
          <div className="h-11 w-full rounded bg-[var(--surface-2)]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
