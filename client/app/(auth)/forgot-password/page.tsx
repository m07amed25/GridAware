"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { useRateLimitCooldown } from "@/components/auth/use-rate-limit-cooldown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildLoginHref,
  validateEmailAddress,
  type FormBannerState,
} from "@/lib/auth/auth-validation";
import { ApiClientError, apiRequest } from "@/lib/auth/client";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(prefillEmail);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<FormBannerState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cooldown = useRateLimitCooldown();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || cooldown.isCoolingDown) {
      return;
    }

    setTouched(true);
    setBanner(null);

    const errText = validateEmailAddress(email);
    setEmailError(errText);
    if (errText) {
      document.getElementById("forgot-email")?.focus();
      return;
    }

    const trimmed = email.trim();
    setSubmitting(true);
    try {
      await apiRequest<{ accepted: true }>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      });
      setSubmittedEmail(trimmed);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "RATE_LIMITED") {
        cooldown.startCooldown(err.retryAfterSeconds);
      } else if (err instanceof ApiClientError) {
        setBanner({
          tone: "error",
          title: "Unable to process request",
          message: err.message,
          requestId: err.problem?.requestId,
        });
      } else {
        setBanner({
          tone: "error",
          title: "Connection unavailable",
          message:
            "We could not process your recovery request right now. Try again in a moment.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
            Check your inbox
          </h1>
          <p className="text-sm leading-5 text-[var(--text-secondary)]">
            Recovery instructions have been processed for your request.
          </p>
        </div>

        <Alert variant="success">
          <AlertTitle>Recovery link requested</AlertTitle>
          <AlertDescription className="space-y-1.5">
            <p>
              If an eligible GridAware account exists for{" "}
              <span className="font-mono text-[var(--text-strong)] break-all">
                {submittedEmail}
              </span>
              , a single-use reset link valid for 60 minutes has been sent.
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Any earlier unused recovery links for that account have been
              invalidated.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-canvas)]/70 p-3.5 text-xs leading-5 text-[var(--text-secondary)]">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-ink)]" aria-hidden="true" />
          <p>
            Didn&apos;t see an email after a few minutes? Check your spam folder
            or verify that you entered the right work email address.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href={buildLoginHref({ email: submittedEmail })}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back to sign in</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setSubmittedEmail(null);
              setBanner(null);
            }}
          >
            Try another email address
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
          Reset your passphrase
        </h1>
        <p className="text-sm leading-5 text-[var(--text-secondary)]">
          Enter your email address to receive a single-use recovery link valid
          for 60 minutes.
        </p>
      </div>

      <RateLimitBanner
        actionLabel="recovery"
        remainingSeconds={cooldown.remainingSeconds}
      />

      {banner ? (
        <Alert variant={banner.tone}>
          {banner.title ? <AlertTitle>{banner.title}</AlertTitle> : null}
          <AlertDescription className="space-y-1.5">
            <p>{banner.message}</p>
            {banner.requestId ? (
              <p className="font-mono text-[11px] text-[var(--text-muted)]">
                Reference ID: {banner.requestId}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="forgot-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => {
            const val = event.target.value;
            setEmail(val);
            if (touched) {
              setEmailError(validateEmailAddress(val));
            }
          }}
          onBlur={() => {
            setTouched(true);
            setEmailError(validateEmailAddress(email));
          }}
          error={emailError}
          placeholder="alex@facility.example"
        />

        <Button
          type="submit"
          loading={submitting}
          loadingLabel="Sending recovery link..."
          disabled={cooldown.isCoolingDown}
          className="w-full"
        >
          {cooldown.isCoolingDown
            ? `Wait ${cooldown.remainingSeconds}s to retry`
            : "Send recovery link"}
        </Button>
      </form>

      <Separator />

      <p className="text-center text-sm text-[var(--text-secondary)]">
        Remembered your passphrase?{" "}
        <Link
          href={buildLoginHref({ email })}
          className="font-semibold text-[var(--accent-ink)] underline underline-offset-4 hover:text-[var(--accent-gold-ink)]"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-busy="true">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
