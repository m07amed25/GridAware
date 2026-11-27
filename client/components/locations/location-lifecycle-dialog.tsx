"use client";

import Link from "next/link";
import React, { useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/auth/client";
import { parseArchiveBlockedBuildingCount } from "@/lib/locations/validation.mjs";

export type LocationLifecycleAction =
  | "activate"
  | "deactivate"
  | "archive"
  | "restore";

const ACTION_COPY: Record<
  LocationLifecycleAction,
  {
    title: (entityLabel: string) => string;
    description: (entityLabel: string, name: string, code: string) => string;
    confirmLabel: string;
    loadingLabel: string;
    variant: "default" | "secondary" | "destructiveSolid";
  }
> = {
  activate: {
    title: (entity) => `Activate ${entity}`,
    description: (entity, name, code) =>
      `Enable ${name} (${code}) as Active so operational workflows can reference this ${entity}. Operational status does not indicate equipment health.`,
    confirmLabel: "Activate",
    loadingLabel: "Activating...",
    variant: "default",
  },
  deactivate: {
    title: (entity) => `Deactivate ${entity}`,
    description: (entity, name, code) =>
      entity === "site"
        ? `Mark ${name} (${code}) as Inactive. Existing buildings are preserved unchanged, but new buildings cannot be added or restored until this site is activated.`
        : `Mark ${name} (${code}) as Inactive while retaining its full history and audit trail.`,
    confirmLabel: "Deactivate",
    loadingLabel: "Deactivating...",
    variant: "secondary",
  },
  archive: {
    title: (entity) => `Archive ${entity}`,
    description: (entity, name, code) =>
      entity === "site"
        ? `Archive ${name} (${code}) non-destructively. It will be hidden from standard lists and its code (${code}) will remain reserved. All buildings under this site must be archived first.`
        : `Archive ${name} (${code}) non-destructively. It will be hidden from standard lists, remain recoverable, and keep code ${code} reserved.`,
    confirmLabel: "Archive",
    loadingLabel: "Archiving...",
    variant: "destructiveSolid",
  },
  restore: {
    title: (entity) => `Restore ${entity}`,
    description: (entity, name, code) =>
      entity === "building"
        ? `Restore ${name} (${code}) to normal listings. Its parent site must be non-archived and Active.`
        : `Restore ${name} (${code}) to normal listings with its prior operational status intact.`,
    confirmLabel: "Restore",
    loadingLabel: "Restoring...",
    variant: "default",
  },
};

interface LocationLifecycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "site" | "building";
  action: LocationLifecycleAction;
  name: string;
  code: string;
  buildingsHref?: string;
  onNavigateToBuildings?: () => void;
  onConfirm: () => Promise<void>;
}

function LifecycleDialogBody({
  onOpenChange,
  entityType,
  action,
  name,
  code,
  buildingsHref,
  onNavigateToBuildings,
  onConfirm,
}: Omit<LocationLifecycleDialogProps, "open">) {
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const copy = ACTION_COPY[action];
  const blockedCount =
    errorCode === "SITE_HAS_ACTIVE_BUILDINGS"
      ? parseArchiveBlockedBuildingCount(errorDetail)
      : null;

  async function handleConfirm() {
    setSubmitting(true);
    setErrorCode(null);
    setErrorDetail(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorCode(error.code);
        setErrorDetail(error.message);
      } else {
        setErrorCode("UNKNOWN");
        setErrorDetail("The lifecycle update could not be completed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{copy.title(entityType)}</AlertDialogTitle>
        <AlertDialogDescription>
          {copy.description(entityType, name, code)}
        </AlertDialogDescription>
      </AlertDialogHeader>

      {errorDetail ? (
        <div
          role="alert"
          className="space-y-3 rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3.5 text-sm text-[var(--text-primary)]"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-medium text-[var(--text-strong)]">
                {errorCode === "SITE_HAS_ACTIVE_BUILDINGS"
                  ? "Archive child buildings first"
                  : errorCode === "SITE_ARCHIVED" ||
                      errorCode === "SITE_INACTIVE"
                    ? "Parent site must be Active"
                    : "Action blocked"}
              </p>
              <p className="text-[var(--text-secondary)]">
                {errorDetail}
                {blockedCount !== null
                  ? ` (${blockedCount} non-archived ${blockedCount === 1 ? "building" : "buildings"})`
                  : ""}
              </p>
            </div>
          </div>

          {errorCode === "SITE_HAS_ACTIVE_BUILDINGS" &&
          (buildingsHref || onNavigateToBuildings) ? (
            <div>
              {onNavigateToBuildings ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onNavigateToBuildings();
                  }}
                >
                  <span>Open buildings in this site</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              ) : buildingsHref ? (
                <Button asChild variant="secondary" size="sm">
                  <Link
                    href={buildingsHref}
                    onClick={() => onOpenChange(false)}
                  >
                    <span>Open buildings in this site</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
        <Button
          variant={copy.variant}
          loading={submitting}
          loadingLabel={copy.loadingLabel}
          onClick={handleConfirm}
        >
          {copy.confirmLabel}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

export function LocationLifecycleDialog(props: LocationLifecycleDialogProps) {
  const { open, onOpenChange, entityType, action, code } = props;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {open ? (
          <LifecycleDialogBody
            key={`${entityType}:${action}:${code}`}
            onOpenChange={onOpenChange}
            entityType={entityType}
            action={action}
            name={props.name}
            code={code}
            buildingsHref={props.buildingsHref}
            onNavigateToBuildings={props.onNavigateToBuildings}
            onConfirm={props.onConfirm}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
