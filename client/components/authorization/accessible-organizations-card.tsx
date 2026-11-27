"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ArrowRight, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listAccessibleOrganizations } from "@/lib/authorization/api";
import type { AccessibleOrganizationSummary } from "@/lib/authorization/types";
import { RoleBadge } from "./role-badge";

export function AccessibleOrganizationsCard() {
  const [organizations, setOrganizations] = useState<
    AccessibleOrganizationSummary[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void listAccessibleOrganizations()
      .then((res) => {
        if (!cancelled) {
          setOrganizations(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrganizations([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2
              className="h-4 w-4 text-[var(--color-yellow)]"
              aria-hidden="true"
            />
            <span>Your Organizations</span>
          </CardTitle>
          <CardDescription>
            Select an active organization workspace or create a new isolated
            tenant workspace.
          </CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href="/onboarding/organization">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create organization</span>
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : organizations.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-secondary)]">
              You do not belong to any active organization yet. Create your
              first organization to become its Owner and configure team roles.
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/onboarding/organization">
                <span>Create first organization</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {organizations.map((org) => (
              <div
                key={org.organizationId}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--text-strong)]">
                      {org.name}
                    </span>
                    <RoleBadge role={org.role} showReadOnlyHint />
                  </div>
                  <p className="font-mono text-xs text-[var(--text-muted)]">
                    {org.slug} · {org.timezone}
                  </p>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/app/organizations/${org.organizationId}`}>
                    <span>Open workspace</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
