import { redirect } from "next/navigation";
import React, { Suspense } from "react";
import { ProtectedAppShell } from "@/components/shell/protected-app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerCurrentUser } from "@/lib/auth/server";

async function ProtectedShellGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerCurrentUser();
  if (!user) {
    redirect("/login?reason=session-expired");
  }

  return <ProtectedAppShell user={user}>{children}</ProtectedAppShell>;
}

function ProtectedShellSkeleton() {
  return (
    <div
      className="flex min-h-svh bg-[var(--surface-canvas)] text-[var(--text-primary)]"
      aria-busy="true"
    >
      <aside className="hidden lg:block lg:shrink-0 lg:sticky lg:top-0 lg:h-svh lg:p-3">
        <div className="flex h-[calc(100svh-24px)] w-[260px] flex-col rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3">
          <div className="flex items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-[34px] w-[34px] rounded-[11px]" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            </div>
            <Skeleton className="h-9 w-9 rounded-[12px]" />
          </div>
          <Skeleton className="mb-3 h-11 w-full rounded-[13px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-11 w-full rounded-[15px]" />
            <Skeleton className="h-11 w-full rounded-[15px]" />
          </div>
          <div className="mt-3 flex items-center gap-2.5 border-t border-[var(--border-subtle)] pt-3">
            <Skeleton className="h-[34px] w-[34px] rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/90 px-4 sm:px-6">
          <Skeleton className="h-9 w-40 rounded-[var(--radius-md)]" />
          <Skeleton className="h-9 w-36 rounded-[var(--radius-md)]" />
        </div>
        <div className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-44 w-full rounded-[var(--radius-card)]" />
        </div>
      </div>
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ProtectedShellSkeleton />}>
      <ProtectedShellGate>{children}</ProtectedShellGate>
    </Suspense>
  );
}
