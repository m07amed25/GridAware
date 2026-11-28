"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiClientError } from "@/lib/auth/client";
import { getOrganizationAccessContext } from "@/lib/authorization/api";
import { can, canAll, isReadOnlyRole } from "@/lib/authorization/permissions.mjs";
import type { OrganizationAccessContext } from "@/lib/authorization/types";
import { matchesEntityRef } from "@/lib/navigation/location-urls.mjs";

export interface AccessContextState {
  organizationId: string;
  organizationSlug: string;
  organizationRef: string;
  accessContext: OrganizationAccessContext | null;
  permissions: ReadonlySet<string>;
  loading: boolean;
  errorStatus: number | null;
  errorMessage: string | null;
  isReadOnly: boolean;
  can: (permission: string) => boolean;
  canAll: (permissions: readonly string[]) => boolean;
  refresh: () => Promise<void>;
}

interface FetchSnapshot {
  organizationRef: string;
  refreshTick: number;
  accessContext: OrganizationAccessContext | null;
  errorStatus: number | null;
  errorMessage: string | null;
}

function snapshotMatchesOrgRef(
  snapshot: FetchSnapshot | null,
  orgRef: string,
): snapshot is FetchSnapshot {
  if (!snapshot) return false;
  const normalizedRef = orgRef.toLowerCase();
  if (snapshot.organizationRef.toLowerCase() === normalizedRef) {
    return true;
  }
  const ctx = snapshot.accessContext;
  if (!ctx) return false;
  return (
    ctx.organizationId === orgRef ||
    (ctx.organizationSlug.length > 0 &&
      ctx.organizationSlug.toLowerCase() === normalizedRef)
  );
}

const AccessContext = createContext<AccessContextState | null>(null);

export function broadcastOrganizationChanged(organizationId: string) {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }
  const channel = new BroadcastChannel("gridaware:org");
  channel.postMessage({ type: "MEMBERSHIP_CHANGED", organizationId });
  channel.close();
}

function AccessContextProviderImpl({
  organizationRef,
  children,
}: {
  organizationRef: string | null;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<FetchSnapshot | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const snapshotRef = useRef<FetchSnapshot | null>(null);
  const latestRequestRef = useRef(0);
  const currentRequestKeyRef = useRef("");

  useLayoutEffect(() => {
    currentRequestKeyRef.current = `${organizationRef ?? ""}:${refreshTick}`;
  }, [organizationRef, refreshTick]);

  const fetchForOrg = useCallback(
    async (targetOrgRef: string, tick: number): Promise<FetchSnapshot> => {
      try {
        const response = await getOrganizationAccessContext(targetOrgRef);
        return {
          organizationRef: targetOrgRef,
          refreshTick: tick,
          accessContext: response.data,
          errorStatus: null,
          errorMessage: null,
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            organizationRef: targetOrgRef,
            refreshTick: tick,
            accessContext: null,
            errorStatus: error.status,
            errorMessage: error.message,
          };
        }
        return {
          organizationRef: targetOrgRef,
          refreshTick: tick,
          accessContext: null,
          errorStatus: 500,
          errorMessage: "Unable to verify organization permissions.",
        };
      }
    },
    [],
  );

  useEffect(() => {
    if (!organizationRef) {
      return;
    }
    if (
      snapshotRef.current &&
      snapshotRef.current.refreshTick === refreshTick &&
      snapshotMatchesOrgRef(snapshotRef.current, organizationRef)
    ) {
      return;
    }
    let cancelled = false;
    const requestKey = currentRequestKeyRef.current;
    const requestId = ++latestRequestRef.current;
    void fetchForOrg(organizationRef, refreshTick).then((result) => {
      if (
        cancelled ||
        requestId !== latestRequestRef.current ||
        requestKey !== currentRequestKeyRef.current
      ) {
        return;
      }
      snapshotRef.current = result;
      setSnapshot(result);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationRef, refreshTick, fetchForOrg]);

  const isCurrentOrgSnapshot =
    organizationRef === null ||
    snapshotMatchesOrgRef(snapshot, organizationRef);
  const loading = organizationRef !== null && !isCurrentOrgSnapshot;
  const accessContext =
    organizationRef !== null && isCurrentOrgSnapshot
      ? snapshot!.accessContext
      : null;
  const errorStatus =
    organizationRef !== null && isCurrentOrgSnapshot
      ? snapshot!.errorStatus
      : null;
  const errorMessage =
    organizationRef !== null && isCurrentOrgSnapshot
      ? snapshot!.errorMessage
      : null;
  const canonicalOrgId = accessContext?.organizationId ?? organizationRef ?? "";
  const canonicalOrgSlug =
    accessContext?.organizationSlug && accessContext.organizationSlug.length > 0
      ? accessContext.organizationSlug
      : organizationRef ?? "";

  useEffect(() => {
    if (!organizationRef || typeof BroadcastChannel === "undefined") {
      return;
    }

    const authChannel = new BroadcastChannel("gridaware:auth");
    const orgChannel = new BroadcastChannel("gridaware:org");

    authChannel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "SESSION_INVALIDATED") {
        latestRequestRef.current += 1;
        const invalidated: FetchSnapshot = {
          organizationRef,
          refreshTick,
          accessContext: null,
          errorStatus: 401,
          errorMessage: "Session ended.",
        };
        snapshotRef.current = invalidated;
        setSnapshot(invalidated);
      } else if (event.data?.type === "SESSION_REFRESHED") {
        setRefreshTick((t) => t + 1);
      }
    };

    orgChannel.onmessage = (
      event: MessageEvent<{ type?: string; organizationId?: string }>,
    ) => {
      if (
        event.data?.type === "MEMBERSHIP_CHANGED" &&
        (!event.data.organizationId ||
          event.data.organizationId === canonicalOrgId ||
          event.data.organizationId.toLowerCase() ===
            canonicalOrgSlug.toLowerCase() ||
          event.data.organizationId.toLowerCase() ===
            organizationRef.toLowerCase())
      ) {
        setRefreshTick((t) => t + 1);
      }
    };

    return () => {
      authChannel.close();
      orgChannel.close();
    };
  }, [organizationRef, canonicalOrgId, canonicalOrgSlug, refreshTick]);

  const refresh = useCallback(async () => {
    if (!organizationRef) {
      return;
    }
    const requestKey = `${organizationRef}:${refreshTick}`;
    if (requestKey !== currentRequestKeyRef.current) {
      return;
    }
    const requestId = ++latestRequestRef.current;
    const result = await fetchForOrg(organizationRef, refreshTick);
    if (
      requestId !== latestRequestRef.current ||
      requestKey !== currentRequestKeyRef.current
    ) {
      return;
    }
    snapshotRef.current = result;
    setSnapshot(result);
  }, [organizationRef, refreshTick, fetchForOrg]);

  const permissionSet = useMemo<ReadonlySet<string>>(
    () => new Set(accessContext?.permissions ?? []),
    [accessContext],
  );

  const value = useMemo<AccessContextState>(
    () => ({
      organizationId: canonicalOrgId,
      organizationSlug: canonicalOrgSlug,
      organizationRef: organizationRef ?? "",
      accessContext,
      permissions: permissionSet,
      loading,
      errorStatus,
      errorMessage,
      isReadOnly: isReadOnlyRole(accessContext?.role),
      can: (permission: string) => can(permissionSet, permission),
      canAll: (required: readonly string[]) => canAll(permissionSet, required),
      refresh,
    }),
    [
      canonicalOrgId,
      canonicalOrgSlug,
      organizationRef,
      accessContext,
      permissionSet,
      loading,
      errorStatus,
      errorMessage,
      refresh,
    ],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

function accessContextMatchesOrgRef(
  context: AccessContextState | null,
  orgRef: string,
): boolean {
  if (!context) return false;
  return (
    matchesEntityRef(
      orgRef,
      context.organizationRef,
      context.organizationSlug,
    ) ||
    matchesEntityRef(orgRef, context.organizationId, context.organizationSlug)
  );
}

export function OrganizationAccessContextProvider({
  organizationId,
  children,
}: {
  organizationId: string;
  children: React.ReactNode;
}) {
  const parentContext = useOptionalAccessContext();
  const [cachedContext, setCachedContext] = useState<AccessContextState | null>(
    null,
  );
  const parentMatches = accessContextMatchesOrgRef(parentContext, organizationId);

  if (parentMatches && parentContext?.accessContext && cachedContext !== parentContext) {
    setCachedContext(parentContext);
  }

  const loadingContext = useMemo<AccessContextState>(
    () => ({
      organizationId,
      organizationSlug: organizationId,
      organizationRef: organizationId,
      accessContext: null,
      permissions: new Set<string>(),
      loading: true,
      errorStatus: null,
      errorMessage: null,
      isReadOnly: false,
      can: () => false,
      canAll: () => false,
      refresh: async () => {},
    }),
    [organizationId],
  );
  const cachedMatches = accessContextMatchesOrgRef(
    cachedContext,
    organizationId,
  );
  const value: AccessContextState =
    parentContext && parentMatches && !parentContext.loading
      ? parentContext
      : cachedContext && cachedMatches
        ? cachedContext
        : parentContext && parentMatches
          ? parentContext
          : loadingContext;

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function AccessContextProvider({
  organizationId,
  children,
}: {
  organizationId: string | null;
  children: React.ReactNode;
}) {
  return (
    <AccessContextProviderImpl organizationRef={organizationId}>
      {children}
    </AccessContextProviderImpl>
  );
}

export function useOptionalAccessContext(): AccessContextState | null {
  return useContext(AccessContext);
}

export function useAccessContext(): AccessContextState {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error(
      "useAccessContext must be used inside an AccessContextProvider.",
    );
  }
  return ctx;
}
