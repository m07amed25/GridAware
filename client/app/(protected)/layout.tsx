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
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-svh lg:shrink-0">
        <div className="flex h-full w-[248px] flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-1)]">
          <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-5">
            <Skeleton className="h-7 w-36 rounded-[var(--radius-sm)]" />
          </div>
          <div className="flex-1 space-y-2 p-3">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-11 w-full rounded-[var(--radius-md)]" />
            <Skeleton className="h-11 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className="space-y-1 border-t border-[var(--border-subtle)] p-3">
            <div className="flex h-12 items-center gap-2.5 px-2">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            </div>
            <Skeleton className="h-11 w-full rounded-[var(--radius-md)]" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-4 sm:px-6">
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
