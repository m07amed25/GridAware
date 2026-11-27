import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import React, { Suspense } from "react";
import { getServerCurrentUser } from "@/lib/auth/server";

async function RootEntry() {
  const user = await getServerCurrentUser();
  if (user) {
    redirect("/app");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-canvas)] px-4 py-12">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 space-y-6">
        <Image
          src="/brand/gridaware-horizontal-dark.svg"
          alt="GridAware"
          width={128}
          height={32}
          priority
          className="h-8 w-auto"
        />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
            Infrastructure monitoring &amp; maintenance intelligence
          </h1>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Sign in with your GridAware account or create a personal identity to
            continue.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-yellow)] px-4 py-2.5 text-sm font-semibold text-[var(--color-black)] hover:bg-[var(--color-lime)]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--surface-canvas)]" aria-busy="true" />
      }
    >
      <RootEntry />
    </Suspense>
  );
}
