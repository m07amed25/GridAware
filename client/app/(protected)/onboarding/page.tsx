import Link from "next/link";
import React, { Suspense } from "react";
import { getServerCurrentUser } from "@/lib/auth/server";

async function OnboardingContent() {
  const user = await getServerCurrentUser();

  return (
    <div className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 space-y-5">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
        Account ready for organization setup
      </h1>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        {user ? `Signed in as ${user.displayName} (${user.email}). ` : ""}
        Organization creation and workspace membership onboarding arrive in
        Phase 5.2.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/app"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-yellow)] px-4 py-2.5 text-sm font-semibold text-[var(--color-black)] hover:bg-[var(--color-lime)]"
        >
          Go to workspace overview
        </Link>
        <Link
          href="/app/profile"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
        >
          Manage active sessions
        </Link>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded bg-[var(--surface-1)]" />}>
      <OnboardingContent />
    </Suspense>
  );
}
