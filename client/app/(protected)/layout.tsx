import { redirect } from "next/navigation";
import React, { Suspense } from "react";
import { ProtectedHeader } from "@/components/auth/protected-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerCurrentUser } from "@/lib/auth/server";

async function ProtectedShell({ children }: { children: React.ReactNode }) {
  const user = await getServerCurrentUser();
  if (!user) {
    redirect("/login?reason=session-expired");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-canvas)]">
      <a
        href="#protected-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-[var(--radius-md)] focus:bg-[var(--color-yellow)] focus:px-4 focus:text-sm focus:font-semibold focus:text-[var(--color-black)]"
      >
        Skip to main content
      </a>

      <ProtectedHeader user={user} />

      <main
        id="protected-main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 focus:outline-none sm:px-8"
      >
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
        <div className="min-h-screen bg-[var(--surface-canvas)]" aria-busy="true">
          <div className="h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 sm:px-8 flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
            <Skeleton className="h-44 w-full max-w-4xl" />
          </div>
        </div>
      }
    >
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}
