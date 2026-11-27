import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--surface-canvas)] px-4 py-8 sm:px-6">
      <header className="mx-auto w-full max-w-[440px] flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center rounded-md py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-lime)]"
          aria-label="GridAware home"
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
      </header>

      <main className="mx-auto my-8 w-full max-w-[440px]">
        <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 sm:p-8">
          {children}
        </section>
      </main>

      <footer className="mx-auto w-full max-w-[440px] text-xs text-[var(--text-muted)] flex items-center justify-between">
        <span>GridAware Identity &amp; Access</span>
        <span>Decision-support platform</span>
      </footer>
    </div>
  );
}
