"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import {
  Archive,
  ChevronRight,
  Info,
  Layers,
  Pencil,
  RotateCcw,
  Ruler,
} from "lucide-react";
import { toast } from "sonner";
import { useAccessContext } from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";
import { BuildingFormDialog } from "@/components/locations/building-form-dialog";
import {
  LocationLifecycleDialog,
  type LocationLifecycleAction,
} from "@/components/locations/location-lifecycle-dialog";
import { LocationStatusBadge } from "@/components/locations/location-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/auth/client";
import {
  activateBuilding,
  archiveBuilding,
  deactivateBuilding,
  getBuilding,
  getSite,
  restoreBuilding,
} from "@/lib/locations/api";
import {
  BUILDING_TYPE_LABELS,
  type BuildingDto,
  type SiteDto,
} from "@/lib/locations/types";
import {
  formatGrossAreaDisplay,
  formatSiteLocalTime,
} from "@/lib/locations/validation.mjs";
import {
  appendSearchAndHash,
  buildingDetailPath,
  matchesEntityRef,
  orgSitesPath,
  siteDetailPath,
} from "@/lib/navigation/location-urls.mjs";

interface BuildingDetailSnapshot {
  organizationId: string;
  siteRef: string;
  buildingRef: string;
  includeArchived: boolean;
  refreshTick: number;
  building: BuildingDto | null;
  site: SiteDto | null;
  errorStatus: number | null;
}

function buildingSnapshotMatches(
  snapshot: BuildingDetailSnapshot | null,
  organizationId: string,
  siteRef: string,
  buildingRef: string,
  includeArchived: boolean,
  refreshTick: number,
): snapshot is BuildingDetailSnapshot {
  if (
    !snapshot ||
    snapshot.organizationId !== organizationId ||
    snapshot.includeArchived !== includeArchived ||
    snapshot.refreshTick !== refreshTick
  ) {
    return false;
  }
  const siteMatches =
    snapshot.siteRef.toLowerCase() === siteRef.toLowerCase() ||
    (snapshot.site !== null &&
      matchesEntityRef(siteRef, snapshot.site.id, snapshot.site.code));
  const buildingMatches =
    snapshot.buildingRef.toLowerCase() === buildingRef.toLowerCase() ||
    (snapshot.building !== null &&
      matchesEntityRef(
        buildingRef,
        snapshot.building.id,
        snapshot.building.code,
      ));
  return siteMatches && buildingMatches;
}

function BuildingDetailInner({
  organizationId,
  organizationSlug,
  siteRef,
  buildingRef,
  initialIncludeArchived,
}: {
  organizationId: string;
  organizationSlug: string;
  siteRef: string;
  buildingRef: string;
  initialIncludeArchived: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessContext, loading: authLoading, can } = useAccessContext();
  const canRead = can("buildings:read");
  const canUpdate = can("buildings:update");
  const canArchive = can("buildings:archive");
  const canArchiveSite = can("sites:archive");

  const [refreshTick, setRefreshTick] = useState(0);
  const [snapshot, setSnapshot] = useState<BuildingDetailSnapshot | null>(null);
  const snapshotRef = useRef<BuildingDetailSnapshot | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] =
    useState<LocationLifecycleAction | null>(null);

  const effectiveIncludeArchived = canArchive && initialIncludeArchived;

  useEffect(() => {
    if (authLoading || !canRead) return;
    if (
      buildingSnapshotMatches(
        snapshotRef.current,
        organizationId,
        siteRef,
        buildingRef,
        effectiveIncludeArchived,
        refreshTick,
      )
    ) {
      return;
    }
    let cancelled = false;

    void (async (): Promise<BuildingDetailSnapshot> => {
      try {
        const buildingRes = await getBuilding(
          organizationId,
          siteRef,
          buildingRef,
          { includeArchived: effectiveIncludeArchived },
        );
        let parentSite: SiteDto | null = null;
        try {
          const siteRes = await getSite(organizationId, siteRef, {
            includeArchived: canArchiveSite && initialIncludeArchived,
          });
          parentSite = siteRes.data;
        } catch {
          parentSite = null;
        }
        return {
          organizationId,
          siteRef,
          buildingRef,
          includeArchived: effectiveIncludeArchived,
          refreshTick,
          building: buildingRes.data,
          site: parentSite,
          errorStatus: null,
        };
      } catch (error) {
        return {
          organizationId,
          siteRef,
          buildingRef,
          includeArchived: effectiveIncludeArchived,
          refreshTick,
          building: null,
          site: null,
          errorStatus: error instanceof ApiClientError ? error.status : 500,
        };
      }
    })().then((result) => {
      if (!cancelled) {
        snapshotRef.current = result;
        setSnapshot(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    canRead,
    effectiveIncludeArchived,
    canArchiveSite,
    initialIncludeArchived,
    organizationId,
    siteRef,
    buildingRef,
    refreshTick,
  ]);

  const isCurrent = buildingSnapshotMatches(
    snapshot,
    organizationId,
    siteRef,
    buildingRef,
    effectiveIncludeArchived,
    refreshTick,
  );
  const loadedBuilding = isCurrent ? snapshot!.building : null;
  const loadedSite = isCurrent ? snapshot!.site : null;

  useEffect(() => {
    if (
      authLoading ||
      !accessContext?.organizationSlug ||
      !loadedBuilding ||
      !loadedSite ||
      loadedBuilding.organizationId !== organizationId ||
      loadedBuilding.siteId !== loadedSite.id
    ) {
      return;
    }
    const canonicalPath = buildingDetailPath(
      accessContext.organizationSlug,
      loadedSite.code,
      loadedBuilding.code,
    );
    if (pathname !== canonicalPath) {
      router.replace(
        appendSearchAndHash(
          canonicalPath,
          window.location.search,
          window.location.hash,
        ),
      );
    }
  }, [
    authLoading,
    accessContext?.organizationSlug,
    loadedBuilding,
    loadedSite,
    organizationId,
    pathname,
    router,
  ]);

  if (authLoading || !isCurrent) {
    return (
      <section aria-busy="true" className="space-y-5">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-44 w-full" />
      </section>
    );
  }

  const fallbackSiteHref = siteDetailPath(
    organizationSlug,
    loadedSite?.code ?? siteRef,
  );

  if (!canRead || snapshot?.errorStatus === 403) {
    return (
      <PermissionDeniedState
        variant="forbidden"
        backHref={fallbackSiteHref}
        backLabel="Back to site"
      />
    );
  }

  const building = loadedBuilding;
  const site = loadedSite;

  if (
    snapshot?.errorStatus === 404 ||
    !building ||
    building.organizationId !== organizationId ||
    (site !== null && building.siteId !== site.id)
  ) {
    return (
      <PermissionDeniedState
        variant="not-found"
        backHref={fallbackSiteHref}
        backLabel="Back to site"
      />
    );
  }

  const currentBuilding = building;
  const isArchived = currentBuilding.archivedAt !== null;
  const siteHref = siteDetailPath(organizationSlug, site?.code ?? siteRef, {
    includeArchived: Boolean(site?.archivedAt),
  });

  async function handleLifecycleConfirm() {
    if (!lifecycleAction) return;
    if (lifecycleAction === "activate") {
      const res = await activateBuilding(
        organizationId,
        currentBuilding.siteId,
        currentBuilding.id,
      );
      toast.success(`${res.data.name} is now Active.`);
    } else if (lifecycleAction === "deactivate") {
      const res = await deactivateBuilding(
        organizationId,
        currentBuilding.siteId,
        currentBuilding.id,
      );
      toast.success(`${res.data.name} is now Inactive.`);
    } else if (lifecycleAction === "archive") {
      const res = await archiveBuilding(
        organizationId,
        currentBuilding.siteId,
        currentBuilding.id,
      );
      toast.success(`${res.data.name} has been archived.`);
    } else {
      const res = await restoreBuilding(
        organizationId,
        currentBuilding.siteId,
        currentBuilding.id,
      );
      toast.success(`${res.data.name} has been restored.`);
    }
    setRefreshTick((t) => t + 1);
  }

  return (
    <section className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--text-muted)]"
      >
        <Link
          href={orgSitesPath(organizationSlug)}
          className="hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          Sites &amp; Buildings
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <Link
          href={siteHref}
          className="hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          {site ? site.name : "Site"}
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="text-[var(--text-primary)]">
          {currentBuilding.name}
        </span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
              {currentBuilding.name}
            </h1>
            <LocationStatusBadge
              status={currentBuilding.status}
              archivedAt={currentBuilding.archivedAt}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]">
              {currentBuilding.code}
            </span>
            <span>{BUILDING_TYPE_LABELS[currentBuilding.type]}</span>
            {site ? (
              <span className="text-[var(--text-muted)]">
                Parent site:{" "}
                <Link
                  href={siteHref}
                  className="text-[var(--text-primary)] underline-offset-4 hover:text-[var(--color-yellow)] hover:underline"
                >
                  {site.name}
                </Link>
              </span>
            ) : null}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Building operational status reflects administrative enablement
              only and does not represent equipment or asset health.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canUpdate ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={isArchived}
                title={
                  isArchived
                    ? "Restore this building before editing metadata"
                    : undefined
                }
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Edit building</span>
              </Button>
              {!isArchived && currentBuilding.status === "ACTIVE" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setLifecycleAction("deactivate")}
                >
                  Deactivate
                </Button>
              ) : null}
              {!isArchived && currentBuilding.status === "INACTIVE" ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setLifecycleAction("activate")}
                >
                  Activate
                </Button>
              ) : null}
            </>
          ) : null}

          {canArchive && !isArchived ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setLifecycleAction("archive")}
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              <span>Archive building</span>
            </Button>
          ) : null}

          {canArchive && isArchived ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => setLifecycleAction("restore")}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Restore building</span>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Floor count
            </dt>
            <dd className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-[var(--text-strong)]">
              <Layers
                className="h-4 w-4 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <span>
                {currentBuilding.floorCount !== null
                  ? `${currentBuilding.floorCount} ${currentBuilding.floorCount === 1 ? "floor" : "floors"}`
                  : "Not specified"}
              </span>
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Gross floor area
            </dt>
            <dd className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-[var(--text-strong)]">
              <Ruler
                className="h-4 w-4 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <span>{formatGrossAreaDisplay(currentBuilding.grossAreaSqM)}</span>
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Created
            </dt>
            <dd className="font-mono text-xs text-[var(--text-primary)]">
              {formatSiteLocalTime(
                site?.timeZone ?? "UTC",
                new Date(currentBuilding.createdAt),
              )}{" "}
              ({site?.timeZone ?? "UTC"})
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Last updated
            </dt>
            <dd className="font-mono text-xs text-[var(--text-primary)]">
              {formatSiteLocalTime(
                site?.timeZone ?? "UTC",
                new Date(currentBuilding.updatedAt),
              )}{" "}
              ({site?.timeZone ?? "UTC"})
            </dd>
          </div>
        </dl>

        {currentBuilding.description ? (
          <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
            <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {currentBuilding.description}
            </p>
          </div>
        ) : null}
      </div>

      {canUpdate ? (
        <BuildingFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          organizationId={organizationId}
          siteId={currentBuilding.siteId}
          siteName={site?.name}
          mode="edit"
          initialBuilding={currentBuilding}
          onSaved={(updated) => {
            toast.success(`Building ${updated.name} updated.`);
            setRefreshTick((t) => t + 1);
          }}
        />
      ) : null}

      {lifecycleAction ? (
        <LocationLifecycleDialog
          open={Boolean(lifecycleAction)}
          onOpenChange={(open) => {
            if (!open) setLifecycleAction(null);
          }}
          entityType="building"
          action={lifecycleAction}
          name={currentBuilding.name}
          code={currentBuilding.code}
          onConfirm={handleLifecycleConfirm}
        />
      ) : null}
    </section>
  );
}

export function BuildingDetailPanel({
  siteRef,
  buildingRef,
}: {
  siteRef: string;
  buildingRef: string;
}) {
  const { organizationId, organizationSlug } = useAccessContext();
  const searchParams = useSearchParams();
  const initialIncludeArchived = searchParams.get("includeArchived") === "true";

  return (
    <BuildingDetailInner
      key={organizationId}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
      siteRef={siteRef}
      buildingRef={buildingRef}
      initialIncludeArchived={initialIncludeArchived}
    />
  );
}
