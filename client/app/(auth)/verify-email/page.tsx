"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import {
  AuthAlertBanner,
  AuthButton,
  AuthField,
} from "@/components/auth/auth-primitives";
import { ApiClientError, apiRequest } from "@/lib/auth/client";

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

  const [email, setEmail] = useState(initialEmail);
  const [resendState, setResendState] = useState<{
    tone: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [resending, setResending] = useState(false);

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
              : "This verification link is invalid or has expired.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendState(null);
    setResending(true);

    try {
      await apiRequest<{ accepted: true }>("/auth/email-verification/resend", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResendState({
        tone: "success",
        message:
          "If an unverified account matches that email, a fresh verification link has been sent.",
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "RATE_LIMITED") {
        const waitText = err.retryAfterSeconds
          ? ` Try again in ${err.retryAfterSeconds} seconds.`
          : " Please wait before requesting another link.";
        setResendState({
          tone: "warning",
          message: `Too many verification resend requests.${waitText}`,
        });
      } else {
        setResendState({
          tone: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to resend verification email.",
        });
      }
    } finally {
      setResending(false);
    }
  }

  if (confirmState === "confirming") {
    return (
      <div className="space-y-4" aria-busy="true">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
          Verifying your email
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Confirming your verification link...
        </p>
      </div>
    );
  }

  if (confirmState === "verified") {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
            Email verified
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Your account is now active and ready to sign in.
          </p>
        </div>

        <AuthAlertBanner tone="success">
          Your email ownership has been confirmed.
        </AuthAlertBanner>

        <Link
          href="/login?verified=1"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-yellow)] px-4 py-2.5 text-sm font-semibold text-[var(--color-black)] hover:bg-[var(--color-lime)]"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
          Verify your email address
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {sent
            ? "We sent a single-use verification link (valid for 24 hours). Open the link in your inbox to activate your account."
            : "Request a fresh single-use verification link to activate your account."}
        </p>
      </div>

      {confirmState === "invalid" && confirmError ? (
        <AuthAlertBanner tone="error">{confirmError}</AuthAlertBanner>
      ) : null}

      {resendState ? (
        <AuthAlertBanner tone={resendState.tone}>
          {resendState.message}
        </AuthAlertBanner>
      ) : null}

      <form onSubmit={handleResend} noValidate className="space-y-4">
        <AuthField
          id="verify-email-input"
          name="email"
          type="email"
          label="Account email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@facility.example"
        />

        <AuthButton
          type="submit"
          variant="primary"
          loading={resending}
          loadingLabel="Sending link..."
          className="w-full"
        >
          Resend verification email
        </AuthButton>
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)]">
        <Link
          href="/login"
          className="font-medium text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--color-lime)]"
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
  const initialEmail = searchParams.get("email") ?? "";
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
        <div className="space-y-4">
          <div className="h-7 w-48 rounded bg-[var(--surface-2)]" />
          <div className="h-11 w-full rounded bg-[var(--surface-2)]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
