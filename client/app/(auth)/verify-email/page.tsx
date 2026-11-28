"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Mail,
} from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { useRateLimitCooldown } from "@/components/auth/use-rate-limit-cooldown";
import { VerificationStepper } from "@/components/auth/verification-stepper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildLoginHref,
  validateEmailAddress,
  type FormBannerState,
} from "@/lib/auth/auth-validation";
import { ApiClientError, apiRequest } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

function VerifyEmailInner({
  token,
  initialEmail,
  sent,
}: {
  token: string | null;
  initialEmail: string;
  sent: boolean;
}) {
  const [confirmState, setConfirmState] = useState<
    "idle" | "confirming" | "verified" | "invalid"
  >(token ? "confirming" : "idle");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmRequestId, setConfirmRequestId] = useState<string | undefined>();

  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resendState, setResendState] = useState<FormBannerState | null>(null);
  const [resending, setResending] = useState(false);

  const cooldown = useRateLimitCooldown();

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;

    apiRequest<{ verified: true }>("/auth/email-verification/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => {
        if (!cancelled) {
          setConfirmState("verified");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setConfirmState("invalid");
          setConfirmError(
            err instanceof ApiClientError
              ? err.message
              : "This verification link is invalid, expired, or has already been used.",
          );
          if (err instanceof ApiClientError) {
            setConfirmRequestId(err.problem?.requestId);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend(event: React.FormEvent) {
    event.preventDefault();
    if (resending || cooldown.isCoolingDown) {
      return;
    }

    setTouched(true);
    setResendState(null);

    const errText = validateEmailAddress(email);
    setEmailError(errText);
    if (errText) {
      document.getElementById("verify-email-input")?.focus();
      return;
    }

    setResending(true);
    try {
      await apiRequest<{ accepted: true }>("/auth/email-verification/resend", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendState({
        tone: "success",
        title: "Verification link sent",
        message:
          "If an unverified account matches that email, a fresh 24-hour verification link has been sent. Any earlier unused verification links have been invalidated.",
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "RATE_LIMITED") {
        cooldown.startCooldown(err.retryAfterSeconds);
      } else if (err instanceof ApiClientError) {
        setResendState({
          tone: "error",
          title: "Unable to send verification email",
          message: err.message,
          requestId: err.problem?.requestId,
        });
      } else {
        setResendState({
          tone: "error",
          title: "Connection unavailable",
          message:
            "We could not request a verification email right now. Try again in a moment.",
        });
      }
    } finally {
      setResending(false);
    }
  }

  if (confirmState === "confirming") {
    return (
      <div className="space-y-6" aria-busy="true">
        <VerificationStepper currentStep={2} />
        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
            Verifying your email
          </h1>
          <p className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-ink)]" aria-hidden="true" />
            <span>Confirming your single-use verification link...</span>
          </p>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    );
  }

  if (confirmState === "verified") {
    return (
      <div className="space-y-6">
        <VerificationStepper currentStep={3} />

        <div className="space-y-1.5">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
            Email verified
          </h1>
          <p className="text-sm leading-5 text-[var(--text-secondary)]">
            Your personal GridAware account is now active and ready for sign-in.
          </p>
        </div>

        <Alert variant="success">
          <AlertTitle>Email ownership confirmed</AlertTitle>
          <AlertDescription>
            This single-use verification link has been consumed. You can now
            sign in with your email and passphrase.
          </AlertDescription>
        </Alert>

        <Button asChild className="w-full">
          <Link href={buildLoginHref({ verified: true, email: initialEmail })}>
            <span>Continue to sign in</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VerificationStepper currentStep={2} />

      <div className="space-y-1.5">
        <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
          {sent ? "Check your inbox" : "Verify your email address"}
        </h1>
        <p className="text-sm leading-5 text-[var(--text-secondary)]">
          {sent
            ? "Open the single-use verification link valid for 24 hours to activate your account before signing in."
            : "Request a fresh 24-hour single-use verification link to activate your GridAware account."}
        </p>
      </div>

      {sent && initialEmail ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-canvas)]/70 px-3.5 py-3">
          <Mail className="h-4 w-4 shrink-0 text-[var(--accent-ink)]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)]">Sent to</p>
            <p className="truncate font-mono text-sm text-[var(--text-strong)]">
              {initialEmail}
            </p>
          </div>
        </div>
      ) : null}

      {confirmState === "invalid" && confirmError ? (
        <Alert variant="error">
          <AlertTitle>Verification link unusable</AlertTitle>
          <AlertDescription className="space-y-1.5">
            <p>{confirmError}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Request a fresh verification email below to receive a new 24-hour
              link.
            </p>
            {confirmRequestId ? (
              <p className="font-mono text-[11px] text-[var(--text-muted)]">
                Reference ID: {confirmRequestId}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <RateLimitBanner
        actionLabel="verification resend"
        remainingSeconds={cooldown.remainingSeconds}
      />

      {resendState ? (
        <Alert variant={resendState.tone}>
          {resendState.title ? <AlertTitle>{resendState.title}</AlertTitle> : null}
          <AlertDescription className="space-y-1.5">
            <p>{resendState.message}</p>
            {resendState.requestId ? (
              <p className="font-mono text-[11px] text-[var(--text-muted)]">
                Reference ID: {resendState.requestId}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/60 px-3.5 py-2 text-start text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <span>Didn&apos;t receive the verification email?</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-150",
                helpOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ul className="list-disc space-y-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-canvas)]/70 py-3 pe-4 ps-8 text-xs leading-5 text-[var(--text-secondary)]">
            <li>Check spam, junk, or corporate quarantine folders.</li>
            <li>Confirm the email address below matches what you registered.</li>
            <li>
              Requesting a new link immediately invalidates earlier unused links
              for your account.
            </li>
          </ul>
        </CollapsibleContent>
      </Collapsible>

      <form onSubmit={handleResend} noValidate className="space-y-4">
        <AuthField
          id="verify-email-input"
          name="email"
          type="email"
          label="Account email"
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
          variant={sent ? "secondary" : "default"}
          loading={resending}
          loadingLabel="Sending link..."
          disabled={cooldown.isCoolingDown}
          className="w-full"
        >
          {cooldown.isCoolingDown
            ? `Wait ${cooldown.remainingSeconds}s to resend`
            : "Resend verification email"}
        </Button>
      </form>

      <Separator />

      <p className="text-center text-sm text-[var(--text-secondary)]">
        Already verified?{" "}
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

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const initialEmail = searchParams.get("email")?.trim() ?? "";
  const sent = searchParams.get("sent") === "1";

  return (
    <VerifyEmailInner
      key={token ?? "no-token"}
      token={token}
      initialEmail={initialEmail}
      sent={sent}
    />
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
