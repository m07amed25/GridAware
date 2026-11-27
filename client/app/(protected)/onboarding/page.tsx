import Link from "next/link";
import React, { Suspense } from "react";
import { ArrowRight, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerCurrentUser } from "@/lib/auth/server";

async function OnboardingContent() {
  const user = await getServerCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
          Workspace onboarding status
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Your personal GridAware identity is verified and ready for tenant
          workspace provisioning.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              Account ready for organization setup
            </CardTitle>
            <CardDescription>
              {user
                ? `Signed in as ${user.displayName} (${user.email}).`
                : "Your authenticated personal identity is active."}
            </CardDescription>
          </div>
          <Badge variant="success">
            <CheckCircle2 aria-hidden="true" />
            <span>Identity active</span>
          </Badge>
        </CardHeader>

        <CardContent className="space-y-5">
          <Separator />

          <ol className="divide-y divide-[var(--border-subtle)]">
            <li className="flex items-start gap-3 py-3 first:pt-0">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-success)]"
                aria-hidden="true"
              />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-[var(--text-strong)]">
                  Personal identity verified
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Email ownership confirmed and protected session established.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 py-3 last:pb-0">
              <Clock
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Organization creation &amp; team invitations
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Tenant workspace creation, role memberships, and site setup
                  arrive in Phase 5.2.
                </p>
              </div>
            </li>
          </ol>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/onboarding/organization">
                <span>Create an organization</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app">
                <span>Go to workspace overview</span>
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/profile">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Manage active sessions</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
