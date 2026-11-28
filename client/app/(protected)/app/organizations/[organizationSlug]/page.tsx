"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import { useAccessContext } from "@/components/authorization/access-context-provider";
import { PermissionGate } from "@/components/authorization/permission-gate";
import { RoleBadge } from "@/components/authorization/role-badge";
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
import { orgOverviewPath } from "@/lib/navigation/location-urls.mjs";

export default function OrganizationOverviewPage() {
  const { organizationId, organizationSlug, accessContext, loading, isReadOnly } =
    useAccessContext();

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    );
  }

  if (!accessContext) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
            Organization access overview
          </h1>
          <p className="font-mono text-xs text-[var(--text-muted)]">
            Slug: {organizationSlug} · Org ID: {organizationId} · Policy v{accessContext.policyVersion}
          </p>
        </div>
        <RoleBadge role={accessContext.role} showReadOnlyHint />
      </div>

      {isReadOnly ? (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]"
        >
          You have <strong className="text-[var(--text-strong)]">Viewer</strong>{" "}
          read-only access in this organization. Operational write and
          administration actions are disabled and enforced server-side.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck
                className="h-4 w-4 text-[var(--accent-ink)]"
                aria-hidden="true"
              />
              <span>Effective capabilities ({accessContext.permissions.length})</span>
            </CardTitle>
            <CardDescription>
              Server-resolved permissions for your active membership. Used for UI
              visibility only; backend enforcement remains authoritative.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {accessContext.permissions.map((perm) => (
              <Badge key={perm} variant="secondary" className="font-mono text-[11px]">
                {perm}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <PermissionGate
          requires="members:read"
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Administration</CardTitle>
                <CardDescription>
                  Organization member administration and role management are
                  available exclusively to Organization Owners.
                </CardDescription>
              </CardHeader>
            </Card>
          }
        >
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users
                  className="h-4 w-4 text-[var(--accent-ink)]"
                  aria-hidden="true"
                />
                <span>Members &amp; Role Administration</span>
              </CardTitle>
              <CardDescription>
                Manage active memberships, assign permitted roles, suspend or
                remove access, or transfer ownership.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`${orgOverviewPath(organizationSlug)}/members`}>
                  <span>Manage members</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PermissionGate>
      </div>
    </div>
  );
}
