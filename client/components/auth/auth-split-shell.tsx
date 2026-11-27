import Image from "next/image";
import Link from "next/link";
import React from "react";

export function AuthSplitShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)] lg:grid lg:grid-cols-[minmax(400px,45%)_1fr]">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-[var(--radius-md)] focus:bg-[var(--color-yellow)] focus:px-4 focus:text-sm focus:font-semibold focus:text-[var(--color-black)]"
      >
        Skip to main content
      </a>

      {/* Minimal Architectural Brand Panel (pattern strictly isolated from form column) */}
      <aside
        aria-label="GridAware"
        className="relative hidden overflow-hidden border-e border-[var(--border-subtle)] bg-[var(--surface-canvas)] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14"
      >
        {/* Approved 3x3 modular GridAware pattern backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none"
        >
          <Image
            src="/brand/gridaware-pattern-dark.svg"
            alt=""
            fill
            priority
            className="object-cover object-center opacity-50"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,8,8,0.6) 0%, rgba(8,8,8,0.22) 45%, rgba(8,8,8,0.86) 82%, rgba(8,8,8,0.96) 100%)",
            }}
          />
        </div>

        {/* Top Lockup with generous 1xN clear space */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center rounded-[var(--radius-sm)] py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
            aria-label="GridAware home"
          >
            <Image
              src="/brand/gridaware-horizontal-dark.svg"
              alt="GridAware"
              width={136}
              height={34}
              priority
              className="h-8 w-auto"
            />
          </Link>
        </div>

        {/* Quiet Editorial Brand Anchor */}
        <div className="relative z-10 max-w-[380px] space-y-3">
          <p className="text-[32px] font-semibold leading-[40px] tracking-[-0.025em] text-[var(--text-strong)] text-balance">
            Vigilant clarity across the grid.
          </p>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            From equipment telemetry to actionable maintenance intelligence.
          </p>
        </div>
      </aside>

      {/* Clean Focused Auth Column (no decorative backdrop behind form controls) */}
      <div className="flex min-h-screen flex-col justify-between gap-6 bg-[var(--surface-canvas)] px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        {/* Mobile & Tablet Brand Header */}
        <header className="mx-auto flex w-full max-w-[440px] items-center justify-between lg:invisible lg:h-0 lg:overflow-hidden">
          <Link
            href="/"
            className="inline-flex items-center rounded-[var(--radius-sm)] py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
            aria-label="GridAware home"
          >
            <Image
              src="/brand/gridaware-horizontal-dark.svg"
              alt="GridAware"
              width={120}
              height={30}
              priority
              className="h-7 w-auto"
            />
          </Link>
        </header>

        <main
          id="auth-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[440px] focus:outline-none lg:my-auto"
        >
          <section className="ga-enter rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 sm:p-8">
            {children}
          </section>
        </main>

        <footer className="mx-auto flex w-full max-w-[440px] flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <span>GridAware Identity &amp; Access</span>
          <span>Decision-support platform</span>
        </footer>
      </div>
    </div>
  );
}
