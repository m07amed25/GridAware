import React, { Suspense } from "react";
import { ActiveSessionsPanel } from "@/components/auth/active-sessions-panel";
import { getServerCurrentUser } from "@/lib/auth/server";

async function ProfileHeader() {
  const user = await getServerCurrentUser();
  if (!user) {
    return null;
  }

  return (
    <section
      aria-labelledby="profile-heading"
      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 space-y-4"
    >
      <div className="space-y-1">
        <h1
          id="profile-heading"
          className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]"
        >
          Account profile
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Verified identity details for your personal GridAware account.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3 border-t border-[var(--border-subtle)] pt-4">
        <div>
          <dt className="text-xs font-medium text-[var(--text-muted)]">
            Display name
          </dt>
          <dd className="mt-1 text-sm font-medium text-[var(--text-strong)]">
            {user.displayName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--text-muted)]">
            Email address
          </dt>
          <dd className="mt-1 font-mono text-sm text-[var(--text-primary)]">
            {user.email}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--text-muted)]">
            Account status
          </dt>
          <dd className="mt-1 inline-flex items-center rounded-md border border-[var(--status-success)] bg-[var(--status-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-success)]">
            {user.status}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Suspense fallback={<div className="h-36 rounded bg-[var(--surface-1)]" />}>
        <ProfileHeader />
      </Suspense>
      <ActiveSessionsPanel />
    </div>
  );
}
