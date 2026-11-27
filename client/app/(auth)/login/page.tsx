"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { FormErrorSummary } from "@/components/auth/form-error-summary";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { useRateLimitCooldown } from "@/components/auth/use-rate-limit-cooldown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildForgotPasswordHref,
  buildFormErrorSummary,
  buildVerifyEmailHref,
  validateEmailAddress,
  validateLoginPassphrase,
  type FormBannerState,
} from "@/lib/auth/auth-validation";
import { ApiClientError, apiRequest } from "@/lib/auth/client";
import { sanitizeNextPath } from "@/lib/auth/proxy-rules.mjs";
import type { SafeUserProfile } from "@/lib/auth/types";

function getInitialArrivalBanner(
  verified: string | null,
  reset: string | null,
  reason: string | null,
): FormBannerState | null {
  if (verified === "1") {
    return {
      tone: "success",
      title: "Email verified",
      message: "Your account is active. Sign in with your passphrase to continue.",
    };
  }
  if (reset === "1") {
    return {
      tone: "success",
      title: "Passphrase updated",
      message:
        "All previous sessions were signed out. Sign in with your new passphrase.",
    };
  }
  if (reason === "session-expired") {
    return {
      tone: "info",
      title: "Session expired",
      message: "Sign in again to continue where you left off.",
    };
  }
  if (reason === "signed-out") {
    return {
      tone: "info",
      title: "Signed out",
      message: "Your session ended cleanly. Sign in whenever you are ready.",
    };
  }
  return null;
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const verified = searchParams.get("verified");
  const reset = searchParams.get("reset");
  const prefillEmail = searchParams.get("email")?.trim() ?? "";
  const nextPath = sanitizeNextPath(searchParams.get("next")) ?? "/app";

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [banner, setBanner] = useState<FormBannerState | null>(() =>
    getInitialArrivalBanner(verified, reset, reason),
  );
  const [submitting, setSubmitting] = useState(false);

  const summaryRef = useRef<HTMLDivElement | null>(null);
  const cooldown = useRateLimitCooldown();

  const errorSummary = useMemo(
    () =>
      submittedOnce
        ? buildFormErrorSummary([
            { fieldId: "login-email", fieldName: "Email", message: fieldErrors.email },
            {
              fieldId: "login-password",
              fieldName: "Passphrase",
              message: fieldErrors.password,
            },
          ])
        : [],
    [submittedOnce, fieldErrors],
  );

  function handleEmailChange(value: string) {
    setEmail(value);
    if (touched.email || submittedOnce) {
      setFieldErrors((prev) => ({
        ...prev,
        email: validateEmailAddress(value),
      }));
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (touched.password || submittedOnce) {
      setFieldErrors((prev) => ({
        ...prev,
        password: validateLoginPassphrase(value),
      }));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || cooldown.isCoolingDown) {
      return;
    }

    setSubmittedOnce(true);
    setBanner(null);

    const nextErrors = {
      email: validateEmailAddress(email),
      password: validateLoginPassphrase(password),
    };
    setFieldErrors(nextErrors);

    const summaryItems = buildFormErrorSummary([
      { fieldId: "login-email", fieldName: "Email", message: nextErrors.email },
      {
        fieldId: "login-password",
        fieldName: "Passphrase",
        message: nextErrors.password,
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
      await apiRequest<{ user: SafeUserProfile }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "RATE_LIMITED") {
          cooldown.startCooldown(err.retryAfterSeconds);
        } else if (err.code === "ACCOUNT_NOT_ACTIVE") {
          setBanner({
            tone: "warning",
            code: err.code,
            title: "Verification required",
            message: err.message,
            requestId: err.problem?.requestId,
          });
        } else {
          setBanner({
            tone: "error",
            code: err.code,
            title:
              err.code === "INVALID_CREDENTIALS"
                ? "Sign-in failed"
                : "Unable to sign in",
            message: err.message,
            requestId:
              err.code === "INVALID_CREDENTIALS"
                ? undefined
                : err.problem?.requestId,
          });
        }
      } else {
        setBanner({
          tone: "error",
          title: "Connection unavailable",
          message:
            "We could not reach the authentication service. Your email address is preserved—try again in a moment.",
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
          Sign in to GridAware
        </h1>
        <p className="text-sm leading-5 text-[var(--text-secondary)]">
          Enter your email and passphrase to access your workspace.
        </p>
      </div>

      <RateLimitBanner
        actionLabel="sign-in"
        remainingSeconds={cooldown.remainingSeconds}
      />

      {banner ? (
        <Alert variant={banner.tone}>
          {banner.title ? <AlertTitle>{banner.title}</AlertTitle> : null}
          <AlertDescription className="space-y-2">
            <p>{banner.message}</p>
            {banner.code === "ACCOUNT_NOT_ACTIVE" && email.trim() ? (
              <div>
                <Link
                  href={buildVerifyEmailHref({ email })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--brand-primary-hover)]"
                >
                  <span>Resend verification email</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
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
        <AuthField
          id="login-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => handleEmailChange(event.target.value)}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, email: true }));
            setFieldErrors((prev) => ({
              ...prev,
              email: validateEmailAddress(email),
            }));
          }}
          error={fieldErrors.email}
          placeholder="alex@facility.example"
        />

        <AuthField
          id="login-password"
          name="password"
          type="password"
          label="Passphrase"
          labelAction={
            <Link
              href={buildForgotPasswordHref({ email })}
              className="text-xs font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--color-yellow)]"
            >
              Forgot passphrase?
            </Link>
          }
          autoComplete="current-password"
          required
          showCapsLockWarning
          value={password}
          onChange={(event) => handlePasswordChange(event.target.value)}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, password: true }));
            if (submittedOnce) {
              setFieldErrors((prev) => ({
                ...prev,
                password: validateLoginPassphrase(password),
              }));
            }
          }}
          error={fieldErrors.password}
        />

        <Button
          type="submit"
          loading={submitting}
          loadingLabel="Signing in..."
          disabled={cooldown.isCoolingDown}
          className="w-full"
        >
          {cooldown.isCoolingDown
            ? `Wait ${cooldown.remainingSeconds}s to retry`
            : "Sign in"}
        </Button>
      </form>

      <Separator />

      <p className="text-center text-sm text-[var(--text-secondary)]">
        New to GridAware?{" "}
        <Link
          href={
            email.trim()
              ? `/register?email=${encodeURIComponent(email.trim())}`
              : "/register"
          }
          className="font-semibold text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--brand-primary-hover)]"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-busy="true">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
