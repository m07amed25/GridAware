"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAccessContext } from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";
import { RoleBadge } from "@/components/authorization/role-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/auth/client";
import { getOrganizationRolesMatrix } from "@/lib/authorization/api";
import type { RolesMatrixData } from "@/lib/authorization/types";
import { orgOverviewPath } from "@/lib/navigation/location-urls.mjs";

interface MatrixState {
  organizationId: string;
  data: RolesMatrixData | null;
  errorStatus: number | null;
}

export default function OrganizationRolesMatrixPage() {
  const { organizationId, organizationSlug, loading: ctxLoading, can } =
    useAccessContext();
  const canRead = !ctxLoading && can("members:read");
  const [state, setState] = useState<MatrixState | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    void getOrganizationRolesMatrix(organizationId)
      .then((res) => {
        if (!cancelled) {
          setState({ organizationId, data: res.data, errorStatus: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            organizationId,
            data: null,
            errorStatus: err instanceof ApiClientError ? err.status : 500,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, canRead]);

  const loadedForOrg = state?.organizationId === organizationId;

  if (ctxLoading || (canRead && !loadedForOrg)) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (loadedForOrg && state.errorStatus === 404) {
    return <PermissionDeniedState variant="not-found" />;
  }

  if (!canRead || (loadedForOrg && state.errorStatus === 403) || !state?.data) {
    return (
      <PermissionDeniedState
        variant="forbidden"
        backHref={orgOverviewPath(organizationSlug)}
        backLabel="Back to organization overview"
        title="Permissions matrix is restricted to Owners"
        description="Only active Organization Owners can inspect the full organization role-to-permission policy matrix."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
            Roles &amp; Permissions Matrix
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Authoritative fixed 5-role RBAC policy (Policy v
            {state.data.policyVersion}). Permissions are enforced server-side on
            every request, query, real-time channel, job, and export.
          </p>
        </div>
        <Badge variant="info">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Fixed MVP RBAC</span>
        </Badge>
      </div>

      <div className="grid gap-4">
        {state.data.roles.map((entry) => (
          <Card key={entry.role}>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-lg">{entry.label}</CardTitle>
                  <RoleBadge role={entry.role} showReadOnlyHint />
                </div>
                <Badge variant="secondary">
                  {entry.permissions.length} permissions
                </Badge>
              </div>
              <CardDescription>{entry.summary}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {entry.permissions.map((perm) => (
                <Badge
                  key={perm}
                  variant="secondary"
                  className="font-mono text-[11px]"
                >
                  {perm}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
