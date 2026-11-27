"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Building2, Eye, Settings, Shield, Users } from "lucide-react";
import {
  AccessContextProvider,
  useAccessContext,
} from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";
import { RoleBadge } from "@/components/authorization/role-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getVisibleOrgNavItems } from "@/lib/authorization/permissions.mjs";
import { cn } from "@/lib/utils";

const NAV_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: Building2,
  members: Users,
  roles: Shield,
  settings: Settings,
};

function OrgSubShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    organizationId,
    accessContext,
    permissions,
    loading,
    errorStatus,
    isReadOnly,
  } = useAccessContext();

  if (!loading && (errorStatus === 404 || !accessContext)) {
    return <PermissionDeniedState variant="not-found" />;
  }

  const navItems = accessContext
    ? getVisibleOrgNavItems(organizationId, permissions)
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {loading || !accessContext ? (
        <div
          className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between"
          aria-busy="true"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-7 w-28" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <nav
            aria-label="Organization sections"
            className="flex flex-wrap items-center gap-2"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = NAV_ICON[item.id] ?? Building2;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-[40px] items-center gap-2 rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                    isActive
                      ? "bg-[var(--surface-3)] font-semibold text-[var(--text-strong)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive
                        ? "text-[var(--color-yellow)]"
                        : "text-[var(--text-muted)]",
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={accessContext.role} showReadOnlyHint />
            {isReadOnly ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Write controls disabled</span>
              </span>
            ) : null}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

export function OrganizationShell({
  organizationId,
  children,
}: {
  organizationId: string;
  children: React.ReactNode;
}) {
  return (
    <AccessContextProvider organizationId={organizationId}>
      <OrgSubShell>{children}</OrgSubShell>
    </AccessContextProvider>
  );
}
