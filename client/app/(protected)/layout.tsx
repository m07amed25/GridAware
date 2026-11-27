import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import React, { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getServerCurrentUser } from "@/lib/auth/server";

async function ProtectedShell({ children }: { children: React.ReactNode }) {
  const user = await getServerCurrentUser();
  if (!user) {
    redirect("/login?reason=session-expired");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-canvas)]">
      <header className="h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 sm:px-8">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/app"
              className="inline-flex items-center rounded-md py-1"
              aria-label="GridAware Dashboard"
            >
              <Image
                src="/brand/gridaware-horizontal-dark.svg"
                alt="GridAware"
                width={112}
                height={28}
                priority
                className="h-7 w-auto"
              />
            </Link>
            <nav aria-label="Primary navigation" className="flex items-center gap-2">
              <Link
                href="/app"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                Overview
              </Link>
              <Link
                href="/app/profile"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                Profile &amp; Sessions
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-[var(--text-secondary)]">
              {user.displayName}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--surface-canvas)] p-8">
          <div className="h-12 w-48 rounded bg-[var(--surface-2)]" />
        </div>
      }
    >
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}
