import Link from "next/link";
import { redirect } from "next/navigation";
import React, { Suspense } from "react";
import { ArrowRight, ShieldCheck, UserPlus } from "lucide-react";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerCurrentUser } from "@/lib/auth/server";

async function RootEntry() {
  const user = await getServerCurrentUser();
  if (user) {
    redirect("/app");
  }

  return (
    <AuthSplitShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
            Access GridAware
          </h1>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Sign in with your verified GridAware identity or create a personal
            account to monitor infrastructure and coordinate maintenance.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/login">
              <span>Sign in to your account</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/register">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>Create personal account</span>
            </Link>
          </Button>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <Badge variant="default">
            <ShieldCheck aria-hidden="true" />
            <span>Email verification required</span>
          </Badge>
          <Link
            href="/forgot-password"
            className="font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--accent-ink)]"
          >
            Need to recover access?
          </Link>
        </div>
      </div>
    </AuthSplitShell>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <AuthSplitShell>
          <div className="space-y-5" aria-busy="true">
            <div className="space-y-2">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        </AuthSplitShell>
      }
    >
      <RootEntry />
    </Suspense>
  );
}
