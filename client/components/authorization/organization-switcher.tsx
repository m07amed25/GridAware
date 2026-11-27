"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listAccessibleOrganizations } from "@/lib/authorization/api";
import { ROLE_LABELS } from "@/lib/authorization/permissions.mjs";
import type { AccessibleOrganizationSummary } from "@/lib/authorization/types";
import { orgOverviewPath } from "@/lib/navigation/location-urls.mjs";

function extractActiveOrgId(pathname: string): string | null {
  const match = /^\/app\/organizations\/([^/]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export function OrganizationSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const activeOrgId = extractActiveOrgId(pathname);
  const [organizations, setOrganizations] = useState<
    AccessibleOrganizationSummary[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await listAccessibleOrganizations();
        if (!cancelled) {
          setOrganizations(res.data);
        }
      } catch {
        if (!cancelled) {
          setOrganizations([]);
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!loaded) {
    return null;
  }

  const normalizedActiveOrg = activeOrgId?.toLowerCase() ?? null;
  const activeOrg =
    organizations.find(
      (org) =>
        org.slug.toLowerCase() === normalizedActiveOrg ||
        org.organizationId === activeOrgId,
    ) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            activeOrg
              ? `Active organization: ${activeOrg.name}. Switch organization`
              : "Select organization workspace"
          }
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <Building2
            className="h-4 w-4 shrink-0 text-[var(--color-yellow)]"
            aria-hidden="true"
          />
          <span className="max-w-[150px] truncate text-[var(--text-strong)]">
            {activeOrg ? activeOrg.name : "Organizations"}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 text-[var(--text-muted)]"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Active Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => {
          const isCurrent =
            org.slug.toLowerCase() === normalizedActiveOrg ||
            org.organizationId === activeOrgId;
          return (
            <DropdownMenuItem
              key={org.organizationId}
              onSelect={() => {
                // Always route to the safe organization landing page on switch
                // so prior-tenant state and role-restricted subroutes are cleared.
                router.push(orgOverviewPath(org.slug));
              }}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                  {org.name}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {ROLE_LABELS[org.role] ?? org.role}
                </p>
              </div>
              {isCurrent ? (
                <Check
                  className="h-4 w-4 shrink-0 text-[var(--color-yellow)]"
                  aria-label="Current organization"
                />
              ) : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding/organization">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create organization</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app">All workspaces overview</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
