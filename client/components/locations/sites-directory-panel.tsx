"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Archive,
  Building2,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAccessContext } from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";
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
  activateSite,
  archiveSite,
  deactivateSite,
  listSites,
  restoreSite,
} from "@/lib/locations/api";
import {
  SITE_TYPE_LABELS,
  type LocationSortDirection,
  type LocationSortField,
  type LocationStatus,
  type SiteDto,
} from "@/lib/locations/types";
import {
  orgOverviewPath,
  siteDetailPath,
} from "@/lib/navigation/location-urls.mjs";

interface SitesSnapshot {
  queryKey: string;
  organizationId: string;
  items: SiteDto[];
  nextCursor: string | null;
  hasMore: boolean;
  errorStatus: number | null;
  errorMessage: string | null;
}

function SitesDirectoryInner({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const { loading: authLoading, can } = useAccessContext();

  const canRead = can("sites:read");
  const canCreate = can("sites:create");
  const canUpdate = can("sites:update");
  const canArchive = can("sites:archive");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LocationStatus>("");
  const [sortField, setSortField] = useState<LocationSortField>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<LocationSortDirection>("desc");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [snapshot, setSnapshot] = useState<SitesSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteDto | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<{
    site: SiteDto;
    action: LocationLifecycleAction;
  } | null>(null);

  const effectiveIncludeArchived = canArchive && includeArchived;
  const queryKey = `${organizationId}|${appliedSearch}|${statusFilter}|${sortField}|${sortDirection}|${effectiveIncludeArchived}|${refreshTick}`;

  useEffect(() => {
    if (authLoading || !canRead) return;
    let cancelled = false;

    void listSites(organizationId, {
      limit: 20,
      q: appliedSearch || undefined,
      status: statusFilter || undefined,
      sort: sortField,
      direction: sortDirection,
      includeArchived: effectiveIncludeArchived,
    })
      .then((res) => {
        if (!cancelled) {
          setSnapshot({
            queryKey,
            organizationId,
            items: res.data,
            nextCursor: res.meta.pagination.nextCursor,
            hasMore: res.meta.pagination.hasMore,
            errorStatus: null,
            errorMessage: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSnapshot({
            queryKey,
            organizationId,
            items: [],
            nextCursor: null,
            hasMore: false,
            errorStatus: error instanceof ApiClientError ? error.status : 500,
            errorMessage:
              error instanceof ApiClientError
                ? error.message
                : "Unable to load sites for this organization.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    canRead,
    organizationId,
    appliedSearch,
    statusFilter,
    sortField,
    sortDirection,
    effectiveIncludeArchived,
    queryKey,
  ]);

  async function handleLoadMore(cursor: string) {
    setLoadingMore(true);
    try {
      const res = await listSites(organizationId, {
        cursor,
        limit: 20,
        q: appliedSearch || undefined,
        status: statusFilter || undefined,
        sort: sortField,
        direction: sortDirection,
        includeArchived: effectiveIncludeArchived,
      });
      setSnapshot((prev) => ({
        queryKey,
        organizationId,
        items:
          prev && prev.queryKey === queryKey
            ? [...prev.items, ...res.data]
            : res.data,
        nextCursor: res.meta.pagination.nextCursor,
        hasMore: res.meta.pagination.hasMore,
        errorStatus: null,
        errorMessage: null,
      }));
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Unable to load more sites.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  if (authLoading) {
    return (
      <section aria-busy="true" className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!canRead) {
    return (
      <PermissionDeniedState
        variant="forbidden"
        backHref={orgOverviewPath(organizationSlug)}
        backLabel="Back to organization"
      />
    );
  }

  const isCurrent =
    snapshot !== null &&
    snapshot.organizationId === organizationId &&
    snapshot.queryKey === queryKey;
  const loading = !isCurrent;
  const errorStatus = isCurrent ? snapshot.errorStatus : null;
  const errorMessage = isCurrent ? snapshot.errorMessage : null;

  if (errorStatus === 403) {
    return (
      <PermissionDeniedState
        variant="forbidden"
        backHref={orgOverviewPath(organizationSlug)}
        backLabel="Back to organization"
      />
    );
  }

  if (errorStatus === 404) {
    return <PermissionDeniedState variant="not-found" />;
  }

  const sites = isCurrent ? snapshot.items : [];
  const hasMore = isCurrent ? snapshot.hasMore : false;
  const nextCursor = isCurrent ? snapshot.nextCursor : null;

  function triggerRefresh() {
    setRefreshTick((t) => t + 1);
  }

  async function executeLifecycleAction() {
    if (!lifecycleTarget) return;
    const { site, action } = lifecycleTarget;
    if (action === "activate") {
      await activateSite(organizationId, site.id);
      toast.success(`${site.name} is now Active.`);
    } else if (action === "deactivate") {
      await deactivateSite(organizationId, site.id);
      toast.success(`${site.name} is now Inactive.`);
    } else if (action === "archive") {
      await archiveSite(organizationId, site.id);
      toast.success(`${site.name} has been archived.`);
    } else {
      await restoreSite(organizationId, site.id);
      toast.success(`${site.name} has been restored.`);
    }
    triggerRefresh();
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
            Sites &amp; Buildings
          </h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Manage physical facilities, campuses, and nested buildings in this
            organization. Site and building status indicates administrative
            enablement, not equipment health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={triggerRefresh}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Refresh</span>
          </Button>
          {canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>New site</span>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
                placeholder="Search by site name or code..."
                aria-label="Search sites by name or code"
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
                aria-label="Filter by operational status"
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
                aria-label="Sort sites"
                className="min-h-[40px] w-auto min-w-[164px] py-1.5 text-sm"
              >
                <SelectValue placeholder="Sort sites" />
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

            {canArchive ? (
              <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent-ink)]"
                />
                <span>Show archived</span>
              </label>
            ) : null}
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5 text-sm text-[var(--status-critical)]">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{errorMessage}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={triggerRefresh}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div
          aria-busy="true"
          className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"
        >
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : sites.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {appliedSearch || statusFilter || effectiveIncludeArchived
                ? "No sites match these filters"
                : "No sites registered yet"}
            </h2>
            <p className="max-w-xl text-sm text-[var(--text-secondary)]">
              {appliedSearch || statusFilter || effectiveIncludeArchived
                ? "Adjust your search query or status filter to view other sites in this organization."
                : canCreate
                  ? "Create your first site to establish the physical location hierarchy for buildings and future equipment monitoring."
                  : "An Organization Owner or Facility Manager can register sites for this organization."}
            </p>
          </div>
          {canCreate && !appliedSearch && !statusFilter ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create first site</span>
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
                    Site
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Location &amp; Time Zone
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Buildings
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
                {sites.map((site) => {
                  const detailHref = siteDetailPath(
                    organizationSlug,
                    site.code,
                    { includeArchived: Boolean(site.archivedAt) },
                  );
                  const locationText = [site.city, site.countryCode]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr
                      key={site.id}
                      className="transition-colors duration-150 hover:bg-[var(--surface-2)]"
                    >
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={detailHref}
                            className="font-medium text-[var(--text-strong)] underline-offset-4 hover:text-[var(--accent-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                          >
                            {site.name}
                          </Link>
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            {site.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-[var(--text-secondary)]">
                        {SITE_TYPE_LABELS[site.type]}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="text-[var(--text-primary)]">
                            {locationText || "Location not specified"}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-[var(--text-muted)]">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span>{site.timeZone}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right align-middle font-mono tabular-nums text-[var(--text-primary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2
                            className="h-3.5 w-3.5 text-[var(--text-muted)]"
                            aria-hidden="true"
                          />
                          <span>{site.buildingCount}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <LocationStatusBadge
                          status={site.status}
                          archivedAt={site.archivedAt}
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
                          {canUpdate && site.archivedAt === null ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSite(site)}
                            >
                              Edit
                            </Button>
                          ) : null}
                          {canArchive && site.archivedAt === null ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setLifecycleTarget({ site, action: "archive" })
                              }
                            >
                              <Archive
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <span>Archive</span>
                            </Button>
                          ) : null}
                          {canArchive && site.archivedAt !== null ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setLifecycleTarget({ site, action: "restore" })
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

          {hasMore && nextCursor ? (
            <div className="flex justify-center border-t border-[var(--border-subtle)] bg-[var(--surface-1)] p-3">
              <Button
                variant="secondary"
                size="sm"
                loading={loadingMore}
                loadingLabel="Loading more..."
                onClick={() => void handleLoadMore(nextCursor)}
              >
                Load more sites
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {canCreate ? (
        <SiteFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          organizationId={organizationId}
          mode="create"
          onSaved={(created) => {
            toast.success(`Site ${created.name} (${created.code}) created.`);
            triggerRefresh();
          }}
        />
      ) : null}

      {canUpdate && editingSite ? (
        <SiteFormDialog
          open={Boolean(editingSite)}
          onOpenChange={(open) => {
            if (!open) setEditingSite(null);
          }}
          organizationId={organizationId}
          mode="edit"
          initialSite={editingSite}
          onSaved={(updated) => {
            toast.success(`Site ${updated.name} updated.`);
            triggerRefresh();
          }}
        />
      ) : null}

      {lifecycleTarget ? (
        <LocationLifecycleDialog
          open={Boolean(lifecycleTarget)}
          onOpenChange={(open) => {
            if (!open) setLifecycleTarget(null);
          }}
          entityType="site"
          action={lifecycleTarget.action}
          name={lifecycleTarget.site.name}
          code={lifecycleTarget.site.code}
          buildingsHref={siteDetailPath(
            organizationSlug,
            lifecycleTarget.site.code,
            { hash: "site-buildings" },
          )}
          onConfirm={executeLifecycleAction}
        />
      ) : null}
    </section>
  );
}

export function SitesDirectoryPanel() {
  const { organizationId, organizationSlug } = useAccessContext();
  return (
    <SitesDirectoryInner
      key={organizationId}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
    />
  );
}
