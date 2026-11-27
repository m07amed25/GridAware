"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import {
  AuthAlertBanner,
  AuthButton,
  AuthField,
} from "@/components/auth/auth-primitives";
import { ApiClientError, apiRequest } from "@/lib/auth/client";
import type { SafeUserProfile } from "@/lib/auth/types";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{
    tone: "error" | "warning";
    code?: string;
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setBanner(null);

    const nextErrors: Record<string, string> = {};
    if (displayName.trim().length < 2) {
      nextErrors.displayName = "Display name must be at least 2 characters.";
    }
    if (!email.trim().includes("@")) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (Array.from(password).length < 12 || Array.from(password).length > 128) {
      nextErrors.password = "Passphrase must be between 12 and 128 characters.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<{ user: SafeUserProfile }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        }),
      });
      router.push(
        `/verify-email?email=${encodeURIComponent(email.trim())}&sent=1`,
      );
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "EMAIL_UNAVAILABLE") {
          setBanner({
            tone: "warning",
            code: err.code,
            message:
              "An account with this email address already exists. Sign in or reset your passphrase instead.",
          });
        } else if (err.code === "RATE_LIMITED") {
          const waitText = err.retryAfterSeconds
            ? ` Try again in ${err.retryAfterSeconds} seconds.`
            : " Please wait before trying again.";
          setBanner({
            tone: "warning",
            code: err.code,
            message: `Too many registration attempts.${waitText}`,
          });
        } else {
          const mapped: Record<string, string> = {};
          for (const fe of err.problem?.errors ?? []) {
            if (fe.field) {
              mapped[fe.field] = fe.message;
            }
          }
          setFieldErrors(mapped);
          setBanner({
            tone: "error",
            code: err.code,
            message: err.message,
          });
        }
      } else {
        setBanner({
          tone: "error",
          message: "Unable to create your account right now. Please try again.",
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
          Create your GridAware account
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Set up a personal identity to access infrastructure monitoring.
        </p>
      </div>

      {banner ? (
        <AuthAlertBanner tone={banner.tone}>
          <p>{banner.message}</p>
          {banner.code === "EMAIL_UNAVAILABLE" ? (
            <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium">
              <Link
                href="/login"
                className="text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--color-lime)]"
              >
                Sign in
              </Link>
              <Link
                href="/forgot-password"
                className="text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--color-lime)]"
              >
                Reset passphrase
              </Link>
            </div>
          ) : null}
        </AuthAlertBanner>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="register-display-name"
          name="displayName"
          type="text"
          label="Full name"
          autoComplete="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={fieldErrors.displayName}
          placeholder="Alex Morgan"
        />

        <AuthField
          id="register-email"
          name="email"
          type="email"
          label="Work email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          placeholder="alex@facility.example"
        />

        <AuthField
          id="register-password"
          name="password"
          type="password"
          label="Passphrase"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Use 12 to 128 characters. Passphrases and password managers are encouraged."
          error={fieldErrors.password}
        />

        <AuthButton
          type="submit"
          variant="primary"
          loading={submitting}
          loadingLabel="Creating account..."
          className="w-full"
        >
          Create account
        </AuthButton>
      </form>

      <p className="text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--color-lime)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
