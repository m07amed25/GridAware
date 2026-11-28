"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { Suspense, useEffect } from "react";
import {
  OrganizationAccessContextProvider,
  useAccessContext,
} from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  appendSearchAndHash,
  isLocationDetailRoute,
  replaceOrgSegmentInPath,
} from "@/lib/navigation/location-urls.mjs";

function OrganizationContentSkeleton() {
  return (
    <div className="mx-auto space-y-6" aria-busy="true">
      <Skeleton className="h-52 w-full" />
    </div>
  );
}

function OrganizationCanonicalPath() {
  const pathname = usePathname();
  const router = useRouter();
  const { accessContext, loading } = useAccessContext();

  useEffect(() => {
    if (
      loading ||
      !accessContext?.organizationSlug ||
      isLocationDetailRoute(pathname)
    ) {
      return;
    }
    const canonicalPath = replaceOrgSegmentInPath(
      pathname,
      accessContext.organizationSlug,
    );
    if (canonicalPath) {
      router.replace(
        appendSearchAndHash(
          canonicalPath,
          window.location.search,
          window.location.hash,
        ),
      );
    }
  }, [loading, accessContext?.organizationSlug, pathname, router]);

  return null;
}

function OrgSubShell({ children }: { children: React.ReactNode }) {
  const { accessContext, loading, errorStatus } = useAccessContext();

  if (!loading && (errorStatus === 404 || !accessContext)) {
    return <PermissionDeniedState variant="not-found" />;
  }

  return (
    <div className="mx-auto space-y-6">
      <Suspense fallback={null}>
        <OrganizationCanonicalPath />
      </Suspense>
      <Suspense fallback={<OrganizationContentSkeleton />}>
        {children}
      </Suspense>
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
    <OrganizationAccessContextProvider organizationId={organizationId}>
      <OrgSubShell>{children}</OrgSubShell>
    </OrganizationAccessContextProvider>
  );
}
