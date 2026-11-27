"use client";

import Link from "next/link";
import React, { useState } from "react";
import {
  AuthAlertBanner,
  AuthButton,
  AuthField,
} from "@/components/auth/auth-primitives";
import { ApiClientError, apiRequest } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [banner, setBanner] = useState<{
    tone: "warning" | "error";
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setSubmitting(true);

    try {
      await apiRequest<{ accepted: true }>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "RATE_LIMITED") {
        const waitText = err.retryAfterSeconds
          ? ` Try again in ${err.retryAfterSeconds} seconds.`
          : " Please wait before trying again.";
        setBanner({
          tone: "warning",
          message: `Too many reset requests.${waitText}`,
        });
      } else {
        setBanner({
          tone: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to process your request.",
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
          Reset your passphrase
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Enter your email address to receive a single-use recovery link valid for
          60 minutes.
        </p>
      </div>

      {submitted ? (
        <AuthAlertBanner tone="success">
          If an account exists for that email address, a password reset link has
          been sent. Any previous unused reset links have been invalidated.
        </AuthAlertBanner>
      ) : null}

      {banner ? (
        <AuthAlertBanner tone={banner.tone}>{banner.message}</AuthAlertBanner>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="forgot-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@facility.example"
        />

        <AuthButton
          type="submit"
          variant="primary"
          loading={submitting}
          loadingLabel="Sending recovery link..."
          className="w-full"
        >
          Send recovery link
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
