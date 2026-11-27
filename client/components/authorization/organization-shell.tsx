"use client";

import React from "react";
import {
  AccessContextProvider,
  useAccessContext,
} from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";

function OrgSubShell({ children }: { children: React.ReactNode }) {
  const { accessContext, loading, errorStatus } = useAccessContext();

  if (!loading && (errorStatus === 404 || !accessContext)) {
    return <PermissionDeniedState variant="not-found" />;
  }

  return <div className="mx-auto max-w-5xl space-y-6">{children}</div>;
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
