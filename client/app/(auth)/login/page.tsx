"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import {
  AuthAlertBanner,
  AuthButton,
  AuthField,
} from "@/components/auth/auth-primitives";
import { ApiClientError, apiRequest } from "@/lib/auth/client";
import { sanitizeNextPath } from "@/lib/auth/proxy-rules.mjs";
import type { SafeUserProfile } from "@/lib/auth/types";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const verified = searchParams.get("verified");
  const nextPath = sanitizeNextPath(searchParams.get("next")) ?? "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [banner, setBanner] = useState<{
    tone: "error" | "warning" | "info" | "success";
    code?: string;
    message: string;
  } | null>(() => {
    if (verified === "1") {
      return {
        tone: "success",
        message: "Email verified. Sign in to access your GridAware account.",
      };
    }
    if (reason === "session-expired") {
      return {
        tone: "info",
        message: "Your session expired. Sign in again to continue.",
      };
    }
    return null;
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
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
          const waitText = err.retryAfterSeconds
            ? ` Try again in ${err.retryAfterSeconds} seconds.`
            : " Please wait before trying again.";
          setBanner({
            tone: "warning",
            code: err.code,
            message: `Too many sign-in attempts.${waitText}`,
          });
        } else if (err.code === "ACCOUNT_NOT_ACTIVE") {
          setBanner({
            tone: "warning",
            code: err.code,
            message: err.message,
          });
        } else {
          setBanner({
            tone: "error",
            code: err.code,
            message: err.message,
          });
        }
      } else {
        setBanner({
          tone: "error",
          message: "Unable to sign in right now. Please try again.",
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
          Sign in to GridAware
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Enter your email and passphrase to continue.
        </p>
      </div>

      {banner ? (
        <AuthAlertBanner tone={banner.tone}>
          <p>{banner.message}</p>
          {banner.code === "ACCOUNT_NOT_ACTIVE" && email.trim() ? (
            <div className="mt-2">
              <Link
                href={`/verify-email?email=${encodeURIComponent(email.trim())}`}
                className="text-xs font-medium text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--color-lime)]"
              >
                Resend verification email
              </Link>
            </div>
          ) : null}
        </AuthAlertBanner>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="login-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@facility.example"
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Passphrase
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--color-yellow)]"
            >
              Forgot passphrase?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-lime)]"
          />
        </div>

        <AuthButton
          type="submit"
          variant="primary"
          loading={submitting}
          loadingLabel="Signing in..."
          className="w-full"
        >
          Sign in
        </AuthButton>
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)]">
        New to GridAware?{" "}
        <Link
          href="/register"
          className="font-medium text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--color-lime)]"
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
        <div className="space-y-4">
          <div className="h-7 w-48 rounded bg-[var(--surface-2)]" />
          <div className="h-11 w-full rounded bg-[var(--surface-2)]" />
          <div className="h-11 w-full rounded bg-[var(--surface-2)]" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
