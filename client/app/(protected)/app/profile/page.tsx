import React, { Suspense } from "react";
import { CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { ActiveSessionsPanel } from "@/components/auth/active-sessions-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { formatExactTimestamp } from "@/lib/auth/session-time";
import type { UserStatus } from "@/lib/auth/types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatStatusLabel(status: UserStatus): {
  label: string;
  variant: "success" | "warning" | "critical";
} {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", variant: "success" };
    case "PENDING_VERIFICATION":
      return { label: "Pending Verification", variant: "warning" };
    case "SUSPENDED":
      return { label: "Suspended", variant: "critical" };
    case "DEACTIVATED":
      return { label: "Deactivated", variant: "critical" };
  }
}

async function ProfileHeader() {
  const user = await getServerCurrentUser();
  if (!user) {
    return null;
  }

  const statusMeta = formatStatusLabel(user.status);

  return (
    <Card aria-labelledby="profile-heading">
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="h-12 w-12 border-[var(--border-default)]">
            <AvatarFallback className="text-sm font-semibold text-[var(--color-yellow)]">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <CardTitle id="profile-heading" className="text-2xl leading-8 tracking-[-0.02em]">
              {user.displayName}
            </CardTitle>
            <CardDescription className="truncate font-mono text-xs text-[var(--text-secondary)]">
              {user.email}
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusMeta.variant}>
            <ShieldCheck aria-hidden="true" />
            <span>{statusMeta.label}</span>
          </Badge>
          {user.emailVerified ? (
            <Badge variant="success">
              <MailCheck aria-hidden="true" />
              <span>Email verified</span>
            </Badge>
          ) : (
            <Badge variant="warning">
              <CheckCircle2 aria-hidden="true" />
              <span>Verification pending</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Identity identifier
            </dt>
            <dd className="truncate font-mono text-xs text-[var(--text-primary)]">
              {user.id}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Account created
            </dt>
            <dd className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
              {formatExactTimestamp(user.createdAt)}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Email verified at
            </dt>
            <dd className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
              {user.emailVerifiedAt
                ? formatExactTimestamp(user.emailVerifiedAt)
                : "Not yet verified"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
          Profile &amp; sessions
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Review your verified GridAware identity and manage active browser
          sessions.
        </p>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardHeader className="flex-row items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-56" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        }
      >
        <ProfileHeader />
      </Suspense>

      <ActiveSessionsPanel />
    </div>
  );
}
