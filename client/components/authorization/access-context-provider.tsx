"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiClientError } from "@/lib/auth/client";
import { getOrganizationAccessContext } from "@/lib/authorization/api";
import { can, canAll, isReadOnlyRole } from "@/lib/authorization/permissions.mjs";
import type { OrganizationAccessContext } from "@/lib/authorization/types";

export interface AccessContextState {
  organizationId: string;
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
  organizationId: string;
  accessContext: OrganizationAccessContext | null;
  errorStatus: number | null;
  errorMessage: string | null;
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

export function AccessContextProvider({
  organizationId,
  children,
}: {
  organizationId: string;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<FetchSnapshot | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchForOrg = useCallback(
    async (targetOrgId: string): Promise<FetchSnapshot> => {
      try {
        const response = await getOrganizationAccessContext(targetOrgId);
        return {
          organizationId: targetOrgId,
          accessContext: response.data,
          errorStatus: null,
          errorMessage: null,
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            organizationId: targetOrgId,
            accessContext: null,
            errorStatus: error.status,
            errorMessage: error.message,
          };
        }
        return {
          organizationId: targetOrgId,
          accessContext: null,
          errorStatus: 500,
          errorMessage: "Unable to verify organization permissions.",
        };
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchForOrg(organizationId).then((result) => {
      if (!cancelled) {
        setSnapshot(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, refreshTick, fetchForOrg]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const authChannel = new BroadcastChannel("gridaware:auth");
    const orgChannel = new BroadcastChannel("gridaware:org");

    authChannel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "SESSION_INVALIDATED") {
        setSnapshot({
          organizationId,
          accessContext: null,
          errorStatus: 401,
          errorMessage: "Session ended.",
        });
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
          event.data.organizationId === organizationId)
      ) {
        setRefreshTick((t) => t + 1);
      }
    };

    return () => {
      authChannel.close();
      orgChannel.close();
    };
  }, [organizationId]);

  const refresh = useCallback(async () => {
    const result = await fetchForOrg(organizationId);
    setSnapshot(result);
  }, [organizationId, fetchForOrg]);

  // Any snapshot from a previous organization is discarded immediately during render.
  const isCurrentOrgSnapshot = snapshot?.organizationId === organizationId;
  const loading = !isCurrentOrgSnapshot;
  const accessContext = isCurrentOrgSnapshot ? snapshot.accessContext : null;
  const errorStatus = isCurrentOrgSnapshot ? snapshot.errorStatus : null;
  const errorMessage = isCurrentOrgSnapshot ? snapshot.errorMessage : null;

  const permissionSet = useMemo<ReadonlySet<string>>(
    () => new Set(accessContext?.permissions ?? []),
    [accessContext],
  );

  const value = useMemo<AccessContextState>(
    () => ({
      organizationId,
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
      organizationId,
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

export function useAccessContext(): AccessContextState {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error(
      "useAccessContext must be used inside an AccessContextProvider.",
    );
  }
  return ctx;
}
