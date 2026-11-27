"use client";

import React from "react";
import { useAccessContext } from "./access-context-provider";

/**
 * Presentation-only gating component. Never treated as a security boundary;
 * every protected backend endpoint enforces permissions independently.
 */
export function PermissionGate({
  requires,
  fallback = null,
  children,
}: {
  requires: string | readonly string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { loading, can, canAll } = useAccessContext();
  if (loading) {
    return null;
  }

  const allowed =
    typeof requires === "string" ? can(requires) : canAll(requires);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
