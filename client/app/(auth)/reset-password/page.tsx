"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { FormErrorSummary } from "@/components/auth/form-error-summary";
import { PassphraseGuidance } from "@/components/auth/passphrase-guidance";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { useRateLimitCooldown } from "@/components/auth/use-rate-limit-cooldown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildFormErrorSummary,
  buildLoginHref,
  validateConfirmPassphrase,
  validateNewPassphrase,
  type FormBannerState,
} from "@/lib/auth/auth-validation";
import { ApiClientError, apiRequest } from "@/lib/auth/client";
import {
  assessPassphrase,
  assessPassphraseMatch,
} from "@/lib/auth/passphrase-policy";

type ResetFields = "newPassword" | "confirmPassword";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<ResetFields, boolean>>({
    newPassword: false,
    confirmPassword: false,
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ResetFields, string>>
  >({});
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [banner, setBanner] = useState<FormBannerState | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const summaryRef = useRef<HTMLDivElement | null>(null);
  const cooldown = useRateLimitCooldown();

  const passphraseAssessment = useMemo(
    () => assessPassphrase(newPassword),
    [newPassword],
  );
  const matchState = useMemo(
    () => assessPassphraseMatch(newPassword, confirmPassword),
    [newPassword, confirmPassword],
  );

  const errorSummary = useMemo(
    () =>
      submittedOnce
        ? buildFormErrorSummary([
            {
              fieldId: "reset-new-password",
              fieldName: "New passphrase",
              message: fieldErrors.newPassword,
            },
            {
              fieldId: "reset-confirm-password",
              fieldName: "Confirm new passphrase",
              message: fieldErrors.confirmPassword,
            },
          ])
        : [],
    [submittedOnce, fieldErrors],
  );

  // Immediately detect missing/blank token before user composes a passphrase
  if (!token) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
            Recovery link required
          </h1>
          <p className="text-sm leading-5 text-[var(--text-secondary)]">
            This page requires a valid single-use reset link from your recovery
            email.
          </p>
        </div>

        <Alert variant="error">
          <AlertTitle>Missing recovery token</AlertTitle>
          <AlertDescription>
            The link you opened is incomplete or was truncated. Request a fresh
            60-minute recovery link to reset your passphrase.
          </AlertDescription>
        </Alert>

        <Button asChild className="w-full">
          <Link href="/forgot-password">
            <span>Request a new reset link</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>

        <Separator />

        <p className="text-center text-sm text-[var(--text-secondary)]">
          <Link
            href="/login"
            className="font-semibold text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--brand-primary-hover)]"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
            Passphrase updated
          </h1>
          <p className="text-sm leading-5 text-[var(--text-secondary)]">
            Your new passphrase is active and your account is ready for sign-in.
          </p>
        </div>

        <Alert variant="success">
          <AlertTitle>All prior sessions signed out</AlertTitle>
          <AlertDescription>
            Your passphrase has been updated and every existing browser session
            has been revoked for your security.
          </AlertDescription>
        </Alert>

        <Button asChild className="w-full">
          <Link href={buildLoginHref({ reset: true })}>
            <span>Sign in with new passphrase</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || cooldown.isCoolingDown) {
      return;
    }

    setSubmittedOnce(true);
    setBanner(null);

    const nextErrors: Partial<Record<ResetFields, string>> = {
      newPassword: validateNewPassphrase(newPassword),
      confirmPassword: validateConfirmPassphrase(newPassword, confirmPassword),
    };
    setFieldErrors(nextErrors);

    const summaryItems = buildFormErrorSummary([
      {
        fieldId: "reset-new-password",
        fieldName: "New passphrase",
        message: nextErrors.newPassword,
      },
      {
        fieldId: "reset-confirm-password",
        fieldName: "Confirm new passphrase",
        message: nextErrors.confirmPassword,
      },
    ]);

    if (summaryItems.length > 0) {
      if (summaryItems.length >= 2) {
        window.requestAnimationFrame(() => summaryRef.current?.focus());
      } else {
        document.getElementById(summaryItems[0].fieldId)?.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<{ reset: true }>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setCompleted(true);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "RATE_LIMITED") {
        cooldown.startCooldown(err.retryAfterSeconds);
      } else if (err instanceof ApiClientError) {
        setBanner({
          tone: "error",
          code: err.code,
          title: "Could not update passphrase",
          message: err.message,
          requestId: err.problem?.requestId,
        });
      } else {
        setBanner({
          tone: "error",
          title: "Reset link unusable",
          message:
            "This reset link is invalid, expired, or has already been used. Request a fresh recovery link.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
          Choose a new passphrase
        </h1>
        <p className="text-sm leading-5 text-[var(--text-secondary)]">
          Set a strong new passphrase to regain access to your GridAware
          account.
        </p>
      </div>

      <Alert variant="info">
        <AlertTitle>Active sessions will be revoked</AlertTitle>
        <AlertDescription>
          Saving a new passphrase immediately signs out all active browsers and
          devices for this account.
        </AlertDescription>
      </Alert>

      <RateLimitBanner
        actionLabel="passphrase reset"
        remainingSeconds={cooldown.remainingSeconds}
      />

      {banner ? (
        <Alert variant={banner.tone}>
          {banner.title ? <AlertTitle>{banner.title}</AlertTitle> : null}
          <AlertDescription className="space-y-2">
            <p>{banner.message}</p>
            <div>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--brand-primary-hover)]"
              >
                <span>Request a fresh recovery link</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            {banner.requestId ? (
              <p className="font-mono text-[11px] text-[var(--text-muted)]">
                Reference ID: {banner.requestId}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <FormErrorSummary errors={errorSummary} summaryRef={summaryRef} />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-2.5">
          <AuthField
            id="reset-new-password"
            name="newPassword"
            type="password"
            label="New passphrase"
            autoComplete="new-password"
            required
            showCapsLockWarning
            value={newPassword}
            onChange={(event) => {
              const val = event.target.value;
              setNewPassword(val);
              if (touched.newPassword || submittedOnce) {
                setFieldErrors((prev) => ({
                  ...prev,
                  newPassword: validateNewPassphrase(val),
                  ...(touched.confirmPassword || submittedOnce
                    ? {
                        confirmPassword: validateConfirmPassphrase(
                          val,
                          confirmPassword,
                        ),
                      }
                    : {}),
                }));
              }
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, newPassword: true }));
              setFieldErrors((prev) => ({
                ...prev,
                newPassword: validateNewPassphrase(newPassword),
              }));
            }}
            error={fieldErrors.newPassword}
          />
          <PassphraseGuidance
            id="reset-password-guidance"
            assessment={passphraseAssessment}
          />
        </div>

        <div className="space-y-1.5">
          <AuthField
            id="reset-confirm-password"
            name="confirmPassword"
            type="password"
            label="Confirm new passphrase"
            autoComplete="new-password"
            required
            showCapsLockWarning
            value={confirmPassword}
            onChange={(event) => {
              const val = event.target.value;
              setConfirmPassword(val);
              if (touched.confirmPassword || submittedOnce) {
                setFieldErrors((prev) => ({
                  ...prev,
                  confirmPassword: validateConfirmPassphrase(newPassword, val),
                }));
              }
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, confirmPassword: true }));
              setFieldErrors((prev) => ({
                ...prev,
                confirmPassword: validateConfirmPassphrase(
                  newPassword,
                  confirmPassword,
                ),
              }));
            }}
            error={fieldErrors.confirmPassword}
          />
          {!fieldErrors.confirmPassword &&
          matchState === "matching" &&
          passphraseAssessment.isPolicyValid ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--status-success)]">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Passphrases match</span>
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          loading={submitting}
          loadingLabel="Updating passphrase..."
          disabled={cooldown.isCoolingDown}
          className="w-full"
        >
          {cooldown.isCoolingDown
            ? `Wait ${cooldown.remainingSeconds}s to retry`
            : "Update passphrase"}
        </Button>
      </form>

      <Separator />

      <p className="text-center text-sm text-[var(--text-secondary)]">
        Link expired?{" "}
        <Link
          href="/forgot-password"
          className="font-semibold text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--brand-primary-hover)]"
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
        <div className="space-y-6" aria-busy="true">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
