import React, { Suspense } from "react";
import { OrganizationShell } from "@/components/authorization/organization-shell";
import { Skeleton } from "@/components/ui/skeleton";

async function OrganizationParamShell({
  params,
  children,
}: {
  params: Promise<{ organizationSlug: string }>;
  children: React.ReactNode;
}) {
  const { organizationSlug } = await params;
  return (
    <OrganizationShell organizationId={organizationSlug}>
      {children}
    </OrganizationShell>
  );
}

export default function OrganizationLayout({
  params,
  children,
}: {
  params: Promise<{ organizationSlug: string }>;
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto space-y-6" aria-busy="true">
          <Skeleton className="h-52 w-full" />
        </div>
      }
    >
      <OrganizationParamShell params={params}>
        {children}
      </OrganizationParamShell>
    </Suspense>
  );
}
