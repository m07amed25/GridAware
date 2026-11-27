"use client";

import React from "react";
import {
  Building2,
  Crown,
  Eye,
  Shield,
  Wrench,
  HardHat,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/authorization/permissions.mjs";
import type { MembershipRole } from "@/lib/authorization/types";

const ROLE_ICON: Record<MembershipRole, React.ComponentType<{ className?: string }>> = {
  OWNER: Crown,
  FACILITY_MANAGER: Building2,
  ENGINEER: Shield,
  TECHNICIAN: Wrench,
  VIEWER: Eye,
};

export function RoleBadge({
  role,
  showReadOnlyHint = false,
}: {
  role: MembershipRole;
  showReadOnlyHint?: boolean;
}) {
  const Icon = ROLE_ICON[role] ?? HardHat;
  const label = ROLE_LABELS[role] ?? role;

  const variant =
    role === "OWNER"
      ? "warning"
      : role === "VIEWER"
        ? "secondary"
        : "info";

  return (
    <Badge variant={variant}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>
        {label}
        {showReadOnlyHint && role === "VIEWER" ? " (Read-only)" : ""}
      </span>
    </Badge>
  );
}
