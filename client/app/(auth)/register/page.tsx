"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
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
  buildForgotPasswordHref,
  buildFormErrorSummary,
  buildLoginHref,
  buildVerifyEmailHref,
  validateConfirmPassphrase,
  validateDisplayName,
  validateEmailAddress,
  validateNewPassphrase,
  type FormBannerState,
} from "@/lib/auth/auth-validation";
import { ApiClientError, apiRequest } from "@/lib/auth/client";
import {
  assessPassphrase,
  assessPassphraseMatch,
} from "@/lib/auth/passphrase-policy";
import type { SafeUserProfile } from "@/lib/auth/types";

type RegisterFields = "displayName" | "email" | "password" | "confirmPassword";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email")?.trim() ?? "";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<RegisterFields, boolean>>({
    displayName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RegisterFields, string>>
  >({});
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [banner, setBanner] = useState<FormBannerState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const summaryRef = useRef<HTMLDivElement | null>(null);
  const cooldown = useRateLimitCooldown();

  const passphraseAssessment = useMemo(
    () => assessPassphrase(password),
    [password],
  );
  const matchState = useMemo(
    () => assessPassphraseMatch(password, confirmPassword),
    [password, confirmPassword],
  );

  const errorSummary = useMemo(
    () =>
      submittedOnce
        ? buildFormErrorSummary([
            {
              fieldId: "register-display-name",
              fieldName: "Full name",
              message: fieldErrors.displayName,
            },
            {
              fieldId: "register-email",
              fieldName: "Work email",
              message: fieldErrors.email,
            },
            {
              fieldId: "register-password",
              fieldName: "Passphrase",
              message: fieldErrors.password,
            },
            {
              fieldId: "register-confirm-password",
              fieldName: "Confirm passphrase",
              message: fieldErrors.confirmPassword,
            },
          ])
        : [],
    [submittedOnce, fieldErrors],
  );

  function revalidateField(
    field: RegisterFields,
    nextValues?: {
      displayName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    },
  ) {
    const d = nextValues?.displayName ?? displayName;
    const e = nextValues?.email ?? email;
    const p = nextValues?.password ?? password;
    const c = nextValues?.confirmPassword ?? confirmPassword;

    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (field === "displayName") {
        updated.displayName = validateDisplayName(d);
      } else if (field === "email") {
        updated.email = validateEmailAddress(e);
      } else if (field === "password") {
        updated.password = validateNewPassphrase(p);
        if (touched.confirmPassword || submittedOnce) {
          updated.confirmPassword = validateConfirmPassphrase(p, c);
        }
      } else if (field === "confirmPassword") {
        updated.confirmPassword = validateConfirmPassphrase(p, c);
      }
      return updated;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || cooldown.isCoolingDown) {
      return;
    }

    setSubmittedOnce(true);
    setBanner(null);

    const nextErrors: Partial<Record<RegisterFields, string>> = {
      displayName: validateDisplayName(displayName),
      email: validateEmailAddress(email),
      password: validateNewPassphrase(password),
      confirmPassword: validateConfirmPassphrase(password, confirmPassword),
    };
    setFieldErrors(nextErrors);

    const summaryItems = buildFormErrorSummary([
      {
        fieldId: "register-display-name",
        fieldName: "Full name",
        message: nextErrors.displayName,
      },
      {
        fieldId: "register-email",
        fieldName: "Work email",
        message: nextErrors.email,
      },
      {
        fieldId: "register-password",
        fieldName: "Passphrase",
        message: nextErrors.password,
      },
      {
        fieldId: "register-confirm-password",
        fieldName: "Confirm passphrase",
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
      await apiRequest<{ user: SafeUserProfile }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
        }),
      });
      router.push(buildVerifyEmailHref({ email: email.trim(), sent: true }));
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "EMAIL_UNAVAILABLE") {
          setBanner({
            tone: "warning",
            code: err.code,
            title: "Email already in use",
            message:
              "An account with this email address already exists. Sign in or reset your passphrase instead.",
          });
        } else if (err.code === "RATE_LIMITED") {
          cooldown.startCooldown(err.retryAfterSeconds);
        } else {
          const mapped: Partial<Record<RegisterFields, string>> = {};
          for (const fe of err.problem?.errors ?? []) {
            if (
              fe.field === "displayName" ||
              fe.field === "email" ||
              fe.field === "password"
            ) {
              mapped[fe.field] = fe.message;
            }
          }
          if (Object.keys(mapped).length > 0) {
            setFieldErrors((prev) => ({ ...prev, ...mapped }));
          }
          setBanner({
            tone: "error",
            code: err.code,
            title: "Could not create account",
            message: err.message,
            requestId: err.problem?.requestId,
          });
        }
      } else {
        setBanner({
          tone: "error",
          title: "Connection unavailable",
          message:
            "We could not create your account right now. Your details are preserved—try again in a moment.",
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
          Create your GridAware account
        </h1>
        <p className="text-sm leading-5 text-[var(--text-secondary)]">
          Set up a personal identity first. Organization workspaces follow
          after verification.
        </p>
      </div>

      <RateLimitBanner
        actionLabel="registration"
        remainingSeconds={cooldown.remainingSeconds}
      />

      {banner ? (
        <Alert variant={banner.tone}>
          {banner.title ? <AlertTitle>{banner.title}</AlertTitle> : null}
          <AlertDescription className="space-y-2">
            <p>{banner.message}</p>
            {banner.code === "EMAIL_UNAVAILABLE" ? (
              <div className="flex flex-wrap gap-4 pt-0.5 text-xs font-semibold">
                <Link
                  href={buildLoginHref({ email })}
                  className="text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--brand-primary-hover)]"
                >
                  Sign in with this email
                </Link>
                <Link
                  href={buildForgotPasswordHref({ email })}
                  className="text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--brand-primary-hover)]"
                >
                  Reset passphrase
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
          id="register-display-name"
          name="displayName"
          type="text"
          label="Full name"
          autoComplete="name"
          required
          value={displayName}
          onChange={(event) => {
            const val = event.target.value;
            setDisplayName(val);
            if (touched.displayName || submittedOnce) {
              revalidateField("displayName", { displayName: val });
            }
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, displayName: true }));
            revalidateField("displayName");
          }}
          error={fieldErrors.displayName}
          placeholder="Alex Morgan"
        />

        <AuthField
          id="register-email"
          name="email"
          type="email"
          label="Work email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => {
            const val = event.target.value;
            setEmail(val);
            if (touched.email || submittedOnce) {
              revalidateField("email", { email: val });
            }
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, email: true }));
            revalidateField("email");
          }}
          error={fieldErrors.email}
          placeholder="alex@facility.example"
        />

        <div className="space-y-2.5">
          <AuthField
            id="register-password"
            name="password"
            type="password"
            label="Passphrase"
            autoComplete="new-password"
            required
            showCapsLockWarning
            value={password}
            onChange={(event) => {
              const val = event.target.value;
              setPassword(val);
              if (touched.password || submittedOnce) {
                revalidateField("password", { password: val });
              }
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, password: true }));
              revalidateField("password");
            }}
            error={fieldErrors.password}
          />
          <PassphraseGuidance
            id="register-password-guidance"
            assessment={passphraseAssessment}
          />
        </div>

        <div className="space-y-1.5">
          <AuthField
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            label="Confirm passphrase"
            autoComplete="new-password"
            required
            showCapsLockWarning
            value={confirmPassword}
            onChange={(event) => {
              const val = event.target.value;
              setConfirmPassword(val);
              if (touched.confirmPassword || submittedOnce) {
                revalidateField("confirmPassword", { confirmPassword: val });
              }
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, confirmPassword: true }));
              revalidateField("confirmPassword");
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
          loadingLabel="Creating account..."
          disabled={cooldown.isCoolingDown}
          className="w-full"
        >
          {cooldown.isCoolingDown
            ? `Wait ${cooldown.remainingSeconds}s to retry`
            : "Create account"}
        </Button>
      </form>

      <Separator />

      <p className="text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link
          href={buildLoginHref({ email })}
          className="font-semibold text-[var(--color-yellow)] underline underline-offset-4 hover:text-[var(--brand-primary-hover)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-busy="true">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
