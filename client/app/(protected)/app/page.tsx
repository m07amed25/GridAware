import Link from "next/link";
import React, { Suspense } from "react";
import { ArrowRight, Compass, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerCurrentUser } from "@/lib/auth/server";

async function AppHomeContent() {
  const user = await getServerCurrentUser();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
            Workspace overview
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {user
              ? `Signed in as ${user.displayName} (${user.email}).`
              : "Authenticated session active."}
          </p>
        </div>
        <Badge variant="success">
          <ShieldCheck aria-hidden="true" />
          <span>Session active</span>
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Identity &amp; Active Sessions</CardTitle>
            <CardDescription>
              Inspect your verified account details, review signed-in devices,
              and revoke unrecognized sessions immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/app/profile">
                <span>Open profile &amp; sessions</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Organization Onboarding</CardTitle>
            <CardDescription>
              Your global personal identity is active and prepared for Phase 5.2
              tenant organization provisioning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href="/onboarding">
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span>View onboarding status</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AppHomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-6" aria-busy="true">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>
      }
    >
      <AppHomeContent />
    </Suspense>
  );
}
