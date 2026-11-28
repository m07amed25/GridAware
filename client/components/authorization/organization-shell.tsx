"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import {
  AccessContextProvider,
  useAccessContext,
} from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";
import {
  appendSearchAndHash,
  isLocationDetailRoute,
  replaceOrgSegmentInPath,
} from "@/lib/navigation/location-urls.mjs";

function OrgSubShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessContext, loading, errorStatus } = useAccessContext();

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

  if (!loading && (errorStatus === 404 || !accessContext)) {
    return <PermissionDeniedState variant="not-found" />;
  }

  return <div className="mx-auto space-y-6">{children}</div>;
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
