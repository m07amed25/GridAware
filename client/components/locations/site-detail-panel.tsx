"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  Building2,
  ChevronRight,
  Clock,
  Globe,
  Info,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
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
import { SiteFormDialog } from "@/components/locations/site-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/auth/client";
import {
  activateBuilding,
  activateSite,
  archiveBuilding,
  archiveSite,
  deactivateBuilding,
  deactivateSite,
  getSite,
  listBuildings,
  restoreBuilding,
  restoreSite,
} from "@/lib/locations/api";
import {
  BUILDING_TYPE_LABELS,
  SITE_TYPE_LABELS,
  type BuildingDto,
  type LocationSortDirection,
  type LocationSortField,
  type LocationStatus,
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

interface SiteSnapshot {
  organizationId: string;
  siteRef: string;
  includeArchived: boolean;
  refreshTick: number;
  site: SiteDto | null;
  errorStatus: number | null;
  errorMessage: string | null;
}

function siteSnapshotMatches(
  snapshot: SiteSnapshot | null,
  organizationId: string,
  siteRef: string,
  includeArchived: boolean,
  refreshTick: number,
): snapshot is SiteSnapshot {
  if (
    !snapshot ||
    snapshot.organizationId !== organizationId ||
    snapshot.includeArchived !== includeArchived ||
    snapshot.refreshTick !== refreshTick
  ) {
    return false;
  }
  if (snapshot.siteRef.toLowerCase() === siteRef.toLowerCase()) {
    return true;
  }
  return (
    snapshot.site !== null &&
    matchesEntityRef(siteRef, snapshot.site.id, snapshot.site.code)
  );
}

interface BuildingsSnapshot {
  queryKey: string;
  items: BuildingDto[];
  nextCursor: string | null;
  hasMore: boolean;
  errorMessage: string | null;
}

function SiteDetailInner({
  organizationId,
  organizationSlug,
  siteRef,
  initialIncludeArchived,
}: {
  organizationId: string;
  organizationSlug: string;
  siteRef: string;
  initialIncludeArchived: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessContext, loading: authLoading, can } = useAccessContext();
  const canReadSite = can("sites:read");
  const canUpdateSite = can("sites:update");
  const canArchiveSite = can("sites:archive");
  const canReadBuildings = can("buildings:read");
  const canCreateBuilding = can("buildings:create");
  const canUpdateBuilding = can("buildings:update");
  const canArchiveBuilding = can("buildings:archive");

  const [siteRefreshTick, setSiteRefreshTick] = useState(0);
  const [siteSnapshot, setSiteSnapshot] = useState<SiteSnapshot | null>(null);
  const siteSnapshotRef = useRef<SiteSnapshot | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LocationStatus>("");
  const [sortField, setSortField] = useState<LocationSortField>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<LocationSortDirection>("desc");
  const [includeArchivedBuildings, setIncludeArchivedBuildings] = useState(
    initialIncludeArchived,
  );
  const [buildingsRefreshTick, setBuildingsRefreshTick] = useState(0);
  const [buildingsSnapshot, setBuildingsSnapshot] =
    useState<BuildingsSnapshot | null>(null);
  const [buildingsLoadingMore, setBuildingsLoadingMore] = useState(false);

  const [editSiteOpen, setEditSiteOpen] = useState(false);
  const [siteLifecycleAction, setSiteLifecycleAction] =
    useState<LocationLifecycleAction | null>(null);
  const [createBuildingOpen, setCreateBuildingOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingDto | null>(
    null,
  );
  const [buildingLifecycleTarget, setBuildingLifecycleTarget] = useState<{
    building: BuildingDto;
    action: LocationLifecycleAction;
  } | null>(null);

  const effectiveSiteIncludeArchived = canArchiveSite && initialIncludeArchived;

  useEffect(() => {
    if (authLoading || !canReadSite) return;
    if (
      siteSnapshotMatches(
        siteSnapshotRef.current,
        organizationId,
        siteRef,
        effectiveSiteIncludeArchived,
        siteRefreshTick,
      )
    ) {
      return;
    }
    let cancelled = false;

    void getSite(organizationId, siteRef, {
      includeArchived: effectiveSiteIncludeArchived,
    })
      .then((res) => {
        if (!cancelled) {
          const next: SiteSnapshot = {
            organizationId,
            siteRef,
            includeArchived: effectiveSiteIncludeArchived,
            refreshTick: siteRefreshTick,
            site: res.data,
            errorStatus: null,
            errorMessage: null,
          };
          siteSnapshotRef.current = next;
          setSiteSnapshot(next);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const next: SiteSnapshot = {
            organizationId,
            siteRef,
            includeArchived: effectiveSiteIncludeArchived,
            refreshTick: siteRefreshTick,
            site: null,
            errorStatus: error instanceof ApiClientError ? error.status : 500,
            errorMessage:
              error instanceof ApiClientError
                ? error.message
                : "Unable to load site details.",
          };
          siteSnapshotRef.current = next;
          setSiteSnapshot(next);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    canReadSite,
    effectiveSiteIncludeArchived,
    organizationId,
    siteRef,
    siteRefreshTick,
  ]);

  const isSiteCurrent = siteSnapshotMatches(
    siteSnapshot,
    organizationId,
    siteRef,
    effectiveSiteIncludeArchived,
    siteRefreshTick,
  );
  const site = isSiteCurrent ? siteSnapshot!.site : null;
  const effectiveIncludeArchivedBuildings =
    canArchiveBuilding &&
    (includeArchivedBuildings || site?.archivedAt !== null);

  useEffect(() => {
    if (
      authLoading ||
      !accessContext?.organizationSlug ||
      !site ||
      site.organizationId !== organizationId
    ) {
      return;
    }
    const canonicalPath = siteDetailPath(
      accessContext.organizationSlug,
      site.code,
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
    site,
    organizationId,
    pathname,
    router,
  ]);

  const scrolledHashRef = useRef<string | null>(null);
  useEffect(() => {
    if (!site || typeof window === "undefined") return;
    if (
      window.location.hash === "#site-buildings" &&
      scrolledHashRef.current !== site.id
    ) {
      const el = document.getElementById("site-buildings");
      if (el) {
        scrolledHashRef.current = site.id;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [site]);

  const buildingsQueryKey = `${organizationId}|${site?.id ?? siteRef}|${appliedSearch}|${statusFilter}|${sortField}|${sortDirection}|${effectiveIncludeArchivedBuildings}|${buildingsRefreshTick}`;

  useEffect(() => {
    if (
      authLoading ||
      !canReadBuildings ||
      !site ||
      site.organizationId !== organizationId
    ) {
      return;
    }
    let cancelled = false;

    void listBuildings(organizationId, site.id, {
      limit: 20,
      q: appliedSearch || undefined,
      status: statusFilter || undefined,
      sort: sortField,
      direction: sortDirection,
      includeArchived: effectiveIncludeArchivedBuildings,
    })
      .then((res) => {
        if (!cancelled) {
          setBuildingsSnapshot({
            queryKey: buildingsQueryKey,
            items: res.data,
            nextCursor: res.meta.pagination.nextCursor,
            hasMore: res.meta.pagination.hasMore,
            errorMessage: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBuildingsSnapshot({
            queryKey: buildingsQueryKey,
            items: [],
            nextCursor: null,
            hasMore: false,
            errorMessage:
              error instanceof ApiClientError
                ? error.message
                : "Unable to load buildings for this site.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    canReadBuildings,
    site,
    organizationId,
    appliedSearch,
    statusFilter,
    sortField,
    sortDirection,
    effectiveIncludeArchivedBuildings,
    buildingsQueryKey,
  ]);

  async function handleLoadMoreBuildings(cursor: string) {
    if (!site) return;
    setBuildingsLoadingMore(true);
    try {
      const res = await listBuildings(organizationId, site.id, {
        cursor,
        limit: 20,
        q: appliedSearch || undefined,
        status: statusFilter || undefined,
        sort: sortField,
        direction: sortDirection,
        includeArchived: effectiveIncludeArchivedBuildings,
      });
      setBuildingsSnapshot((prev) => ({
        queryKey: buildingsQueryKey,
        items:
          prev && prev.queryKey === buildingsQueryKey
            ? [...prev.items, ...res.data]
            : res.data,
        nextCursor: res.meta.pagination.nextCursor,
        hasMore: res.meta.pagination.hasMore,
        errorMessage: null,
      }));
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Unable to load more buildings.",
      );
    } finally {
      setBuildingsLoadingMore(false);
    }
  }

  if (authLoading || !isSiteCurrent) {
    return (
      <section aria-busy="true" className="space-y-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!canReadSite || siteSnapshot?.errorStatus === 403) {
    return (
      <PermissionDeniedState
        variant="forbidden"
        backHref={orgSitesPath(organizationSlug)}
        backLabel="Back to sites"
      />
    );
  }

  if (
    siteSnapshot?.errorStatus === 404 ||
    !site ||
    site.organizationId !== organizationId
  ) {
    return (
      <PermissionDeniedState
        variant="not-found"
        backHref={orgSitesPath(organizationSlug)}
        backLabel="Back to sites"
      />
    );
  }

  const currentSite = site;
  const isSiteArchived = currentSite.archivedAt !== null;
  const canAddBuildingNow =
    canCreateBuilding && !isSiteArchived && currentSite.status === "ACTIVE";
  const isBuildingsCurrent =
    buildingsSnapshot !== null &&
    buildingsSnapshot.queryKey === buildingsQueryKey;
  const buildingsLoading = !isBuildingsCurrent;
  const buildings = isBuildingsCurrent ? buildingsSnapshot.items : [];
  const hasMoreBuildings = isBuildingsCurrent
    ? buildingsSnapshot.hasMore
    : false;
  const nextBuildingsCursor = isBuildingsCurrent
    ? buildingsSnapshot.nextCursor
    : null;
  const buildingsError = isBuildingsCurrent
    ? buildingsSnapshot.errorMessage
    : null;

  const addressParts = [
    currentSite.addressLine1,
    currentSite.addressLine2,
    currentSite.city,
    currentSite.region,
    currentSite.postalCode,
    currentSite.countryCode,
  ].filter(Boolean);

  function refreshAll() {
    setSiteRefreshTick((t) => t + 1);
    setBuildingsRefreshTick((t) => t + 1);
  }

  async function handleSiteLifecycleConfirm() {
    if (!siteLifecycleAction) return;
    if (siteLifecycleAction === "activate") {
      const res = await activateSite(organizationId, currentSite.id);
      toast.success(`${res.data.name} is now Active.`);
    } else if (siteLifecycleAction === "deactivate") {
      const res = await deactivateSite(organizationId, currentSite.id);
      toast.success(`${res.data.name} is now Inactive.`);
    } else if (siteLifecycleAction === "archive") {
      const res = await archiveSite(organizationId, currentSite.id);
      toast.success(`${res.data.name} has been archived.`);
    } else {
      const res = await restoreSite(organizationId, currentSite.id);
      toast.success(`${res.data.name} has been restored.`);
    }
    setSiteRefreshTick((t) => t + 1);
  }

  async function handleBuildingLifecycleConfirm() {
    if (!buildingLifecycleTarget) return;
    const { building, action } = buildingLifecycleTarget;
    if (action === "activate") {
      await activateBuilding(organizationId, currentSite.id, building.id);
      toast.success(`${building.name} is now Active.`);
    } else if (action === "deactivate") {
      await deactivateBuilding(organizationId, currentSite.id, building.id);
      toast.success(`${building.name} is now Inactive.`);
    } else if (action === "archive") {
      await archiveBuilding(organizationId, currentSite.id, building.id);
      toast.success(`${building.name} has been archived.`);
    } else {
      await restoreBuilding(organizationId, currentSite.id, building.id);
      toast.success(`${building.name} has been restored.`);
    }
    refreshAll();
  }

  function scrollToBuildingsSection() {
    const el = document.getElementById("site-buildings");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus?.();
    }
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
        <span className="text-[var(--text-primary)]">{currentSite.name}</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
              {currentSite.name}
            </h1>
            <LocationStatusBadge
              status={currentSite.status}
              archivedAt={currentSite.archivedAt}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]">
              {currentSite.code}
            </span>
            <span>{SITE_TYPE_LABELS[currentSite.type]}</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)]">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {formatSiteLocalTime(currentSite.timeZone)} (
                {currentSite.timeZone})
              </span>
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Site operational status reflects administrative enablement only
              and does not represent equipment or asset health.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canUpdateSite ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={isSiteArchived}
                title={
                  isSiteArchived
                    ? "Restore this site before editing metadata"
                    : undefined
                }
                onClick={() => setEditSiteOpen(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Edit site</span>
              </Button>
              {!isSiteArchived && currentSite.status === "ACTIVE" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSiteLifecycleAction("deactivate")}
                >
                  Deactivate
                </Button>
              ) : null}
              {!isSiteArchived && currentSite.status === "INACTIVE" ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setSiteLifecycleAction("activate")}
                >
                  Activate
                </Button>
              ) : null}
            </>
          ) : null}

          {canArchiveSite && !isSiteArchived ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSiteLifecycleAction("archive")}
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              <span>Archive site</span>
            </Button>
          ) : null}

          {canArchiveSite && isSiteArchived ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => setSiteLifecycleAction("restore")}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Restore site</span>
            </Button>
          ) : null}
        </div>
      </header>

      {siteSnapshot?.errorMessage ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] px-4 py-3 text-sm text-[var(--status-critical)]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{siteSnapshot.errorMessage}</span>
        </div>
      ) : null}

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Address
            </dt>
            <dd className="flex items-start gap-1.5 text-sm text-[var(--text-primary)]">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <span>
                {addressParts.length > 0
                  ? addressParts.join(", ")
                  : "Not specified"}
              </span>
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Coordinates
            </dt>
            <dd className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-[var(--text-primary)]">
              <Globe
                className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <span>
                {currentSite.latitude !== null && currentSite.longitude !== null
                  ? `${currentSite.latitude.toFixed(4)}, ${currentSite.longitude.toFixed(4)}`
                  : "Not specified"}
              </span>
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Non-archived buildings
            </dt>
            <dd className="font-mono text-sm tabular-nums text-[var(--text-strong)]">
              {currentSite.buildingCount}
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-xs font-medium text-[var(--text-muted)]">
              Operational time zone
            </dt>
            <dd className="font-mono text-sm text-[var(--text-primary)]">
              {currentSite.timeZone}
            </dd>
          </div>
        </dl>

        {currentSite.description ? (
          <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
            <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {currentSite.description}
            </p>
          </div>
        ) : null}
      </div>

      {/* Nested Buildings Section */}
      <div
        id="site-buildings"
        tabIndex={-1}
        className="space-y-4 focus:outline-none"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.015em] text-[var(--text-strong)]">
              Buildings in this site
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Every building belongs strictly to this site and organization.
            </p>
          </div>

          {canCreateBuilding ? (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <Button
                disabled={!canAddBuildingNow}
                onClick={() => setCreateBuildingOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add building</span>
              </Button>
              {!canAddBuildingNow ? (
                <p className="text-xs text-[var(--status-warning)]">
                  {isSiteArchived
                    ? "Restore and activate this site before adding buildings."
                    : "Activate this site before adding new buildings."}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 lg:flex-row lg:items-center">
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedSearch(searchInput.trim());
            }}
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search buildings by name or code..."
                aria-label="Search buildings by name or code"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            {appliedSearch ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setAppliedSearch("");
                }}
              >
                Clear
              </Button>
            ) : null}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter || "ALL"}
              onValueChange={(next) =>
                setStatusFilter(next === "ALL" ? "" : (next as LocationStatus))
              }
            >
              <SelectTrigger
                aria-label="Filter buildings by operational status"
                className="min-h-[40px] w-auto min-w-[148px] py-1.5 text-sm"
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${sortField}:${sortDirection}`}
              onValueChange={(next) => {
                const [field, dir] = next.split(":") as [
                  LocationSortField,
                  LocationSortDirection,
                ];
                setSortField(field);
                setSortDirection(dir);
              }}
            >
              <SelectTrigger
                aria-label="Sort buildings"
                className="min-h-[40px] w-auto min-w-[164px] py-1.5 text-sm"
              >
                <SelectValue placeholder="Sort buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt:desc">Newest first</SelectItem>
                <SelectItem value="createdAt:asc">Oldest first</SelectItem>
                <SelectItem value="name:asc">Name (A–Z)</SelectItem>
                <SelectItem value="name:desc">Name (Z–A)</SelectItem>
                <SelectItem value="code:asc">Code (A–Z)</SelectItem>
                <SelectItem value="code:desc">Code (Z–A)</SelectItem>
              </SelectContent>
            </Select>

            {canArchiveBuilding ? (
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={effectiveIncludeArchivedBuildings}
                  onChange={(e) =>
                    setIncludeArchivedBuildings(e.target.checked)
                  }
                  className="h-4 w-4 accent-[var(--accent-ink)]"
                />
                <span>Show archived</span>
              </label>
            ) : null}
          </div>
        </div>

        {buildingsError ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-4 text-sm text-[var(--status-critical)]"
          >
            <span>{buildingsError}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBuildingsRefreshTick((t) => t + 1)}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {buildingsLoading ? (
          <div
            aria-busy="true"
            className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"
          >
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : buildings.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[var(--text-strong)]">
                {appliedSearch || statusFilter
                  ? "No buildings match these filters"
                  : "No buildings registered under this site"}
              </h3>
              <p className="max-w-xl text-sm text-[var(--text-secondary)]">
                {appliedSearch || statusFilter
                  ? "Try clearing your search or status filter."
                  : canAddBuildingNow
                    ? "Add buildings such as production halls, utility buildings, warehouses, or office towers."
                    : "Buildings will appear here once added by an Owner or Facility Manager."}
              </p>
            </div>
            {canAddBuildingNow && !appliedSearch && !statusFilter ? (
              <Button size="sm" onClick={() => setCreateBuildingOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add first building</span>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] text-xs font-medium text-[var(--text-muted)]">
                    <th scope="col" className="px-4 py-3">
                      Building
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Floors
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Gross area
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {buildings.map((building) => {
                    const detailHref = buildingDetailPath(
                      organizationSlug,
                      currentSite.code,
                      building.code,
                      { includeArchived: Boolean(building.archivedAt) },
                    );
                    return (
                      <tr
                        key={building.id}
                        className="transition-colors duration-150 hover:bg-[var(--surface-2)]"
                      >
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={detailHref}
                              className="font-medium text-[var(--text-strong)] underline-offset-4 hover:text-[var(--accent-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                            >
                              {building.name}
                            </Link>
                            <span className="font-mono text-xs text-[var(--text-muted)]">
                              {building.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle text-[var(--text-secondary)]">
                          {BUILDING_TYPE_LABELS[building.type]}
                        </td>
                        <td className="px-4 py-3.5 text-right align-middle font-mono tabular-nums text-[var(--text-primary)]">
                          {building.floorCount !== null
                            ? building.floorCount
                            : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right align-middle font-mono tabular-nums text-[var(--text-primary)]">
                          {building.grossAreaSqM !== null
                            ? formatGrossAreaDisplay(building.grossAreaSqM)
                            : "—"}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <LocationStatusBadge
                            status={building.status}
                            archivedAt={building.archivedAt}
                          />
                        </td>
                        <td className="px-4 py-3.5 text-right align-middle">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={detailHref}>
                                <span>Open</span>
                                <ChevronRight
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              </Link>
                            </Button>
                            {canUpdateBuilding &&
                            building.archivedAt === null ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingBuilding(building)}
                              >
                                Edit
                              </Button>
                            ) : null}
                            {canArchiveBuilding &&
                            building.archivedAt === null ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setBuildingLifecycleTarget({
                                    building,
                                    action: "archive",
                                  })
                                }
                              >
                                Archive
                              </Button>
                            ) : null}
                            {canArchiveBuilding &&
                            building.archivedAt !== null ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setBuildingLifecycleTarget({
                                    building,
                                    action: "restore",
                                  })
                                }
                              >
                                Restore
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMoreBuildings && nextBuildingsCursor ? (
              <div className="flex justify-center border-t border-[var(--border-subtle)] p-3">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={buildingsLoadingMore}
                  loadingLabel="Loading more..."
                  onClick={() =>
                    void handleLoadMoreBuildings(nextBuildingsCursor)
                  }
                >
                  Load more buildings
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {canUpdateSite ? (
        <SiteFormDialog
          open={editSiteOpen}
          onOpenChange={setEditSiteOpen}
          organizationId={organizationId}
          mode="edit"
          initialSite={currentSite}
          onSaved={(updated) => {
            toast.success(`Site ${updated.name} updated.`);
            setSiteRefreshTick((t) => t + 1);
          }}
        />
      ) : null}

      {siteLifecycleAction ? (
        <LocationLifecycleDialog
          open={Boolean(siteLifecycleAction)}
          onOpenChange={(open) => {
            if (!open) setSiteLifecycleAction(null);
          }}
          entityType="site"
          action={siteLifecycleAction}
          name={currentSite.name}
          code={currentSite.code}
          onNavigateToBuildings={scrollToBuildingsSection}
          onConfirm={handleSiteLifecycleConfirm}
        />
      ) : null}

      {canCreateBuilding ? (
        <BuildingFormDialog
          open={createBuildingOpen}
          onOpenChange={setCreateBuildingOpen}
          organizationId={organizationId}
          siteId={currentSite.id}
          siteName={currentSite.name}
          mode="create"
          onSaved={(created) => {
            toast.success(`Building ${created.name} (${created.code}) added.`);
            refreshAll();
          }}
        />
      ) : null}

      {canUpdateBuilding && editingBuilding ? (
        <BuildingFormDialog
          open={Boolean(editingBuilding)}
          onOpenChange={(open) => {
            if (!open) setEditingBuilding(null);
          }}
          organizationId={organizationId}
          siteId={currentSite.id}
          siteName={currentSite.name}
          mode="edit"
          initialBuilding={editingBuilding}
          onSaved={(updated) => {
            toast.success(`Building ${updated.name} updated.`);
            setBuildingsRefreshTick((t) => t + 1);
          }}
        />
      ) : null}

      {buildingLifecycleTarget ? (
        <LocationLifecycleDialog
          open={Boolean(buildingLifecycleTarget)}
          onOpenChange={(open) => {
            if (!open) setBuildingLifecycleTarget(null);
          }}
          entityType="building"
          action={buildingLifecycleTarget.action}
          name={buildingLifecycleTarget.building.name}
          code={buildingLifecycleTarget.building.code}
          onConfirm={handleBuildingLifecycleConfirm}
        />
      ) : null}
    </section>
  );
}

export function SiteDetailPanel({ siteRef }: { siteRef: string }) {
  const { organizationId, organizationSlug } = useAccessContext();
  const searchParams = useSearchParams();
  const initialIncludeArchived = searchParams.get("includeArchived") === "true";

  return (
    <SiteDetailInner
      key={organizationId}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
      siteRef={siteRef}
      initialIncludeArchived={initialIncludeArchived}
    />
  );
}
