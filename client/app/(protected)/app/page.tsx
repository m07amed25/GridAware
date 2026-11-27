import Link from "next/link";
import React, { Suspense } from "react";
import { getServerCurrentUser } from "@/lib/auth/server";

async function AppHomeContent() {
  const user = await getServerCurrentUser();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
          Workspace overview
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {user
            ? `Authenticated as ${user.displayName} (${user.email}).`
            : "Authenticated session active."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 space-y-3">
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            Identity &amp; Active Sessions
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Review your verified account details and revoke active browser
            sessions.
          </p>
          <Link
            href="/app/profile"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-yellow)] px-4 py-2 text-sm font-semibold text-[var(--color-black)] hover:bg-[var(--color-lime)]"
          >
            Open profile &amp; sessions
          </Link>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 space-y-3">
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            Organization Onboarding
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Your global identity is active and ready for tenant organization
            provisioning.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
          >
            View onboarding status
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AppHomePage() {
  return (
    <Suspense fallback={<div className="h-48 rounded bg-[var(--surface-1)]" />}>
      <AppHomeContent />
    </Suspense>
  );
}
