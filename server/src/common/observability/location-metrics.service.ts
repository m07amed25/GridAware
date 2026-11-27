import { Injectable } from '@nestjs/common';

export type LocationMetricResource = 'site' | 'building';
export type LocationMetricAction =
  | 'create'
  | 'update'
  | 'activate'
  | 'deactivate'
  | 'archive'
  | 'restore';
export type LocationMetricResult = 'success' | 'conflict' | 'error';
export type LocationMetricOperation =
  | 'listSites'
  | 'createSite'
  | 'getSite'
  | 'updateSite'
  | 'activateSite'
  | 'deactivateSite'
  | 'archiveSite'
  | 'restoreSite'
  | 'listBuildings'
  | 'createBuilding'
  | 'getBuilding'
  | 'updateBuilding'
  | 'activateBuilding'
  | 'deactivateBuilding'
  | 'archiveBuilding'
  | 'restoreBuilding';
export type LocationConflictReason =
  | 'duplicate_code'
  | 'site_archived'
  | 'site_inactive'
  | 'site_has_active_buildings'
  | 'invalid_location_state';

export interface DurationSummary {
  readonly count: number;
  readonly sumSeconds: number;
  readonly maxSeconds: number;
}

export interface LocationMetricsSnapshot {
  readonly gridaware_sites_created_total: number;
  readonly gridaware_buildings_created_total: number;
  readonly gridaware_location_mutations_total: Readonly<Record<string, number>>;
  readonly gridaware_location_api_requests_total: Readonly<
    Record<string, number>
  >;
  readonly gridaware_location_api_duration_seconds: Readonly<
    Record<string, DurationSummary>
  >;
  readonly gridaware_location_conflicts_total: Readonly<Record<string, number>>;
}

/**
 * Low-cardinality operational metrics recorder for Phase 5.4 Sites & Buildings.
 * Strictly forbids tenant, site, building, or user IDs in metric labels.
 */
@Injectable()
export class LocationMetricsService {
  private sitesCreatedTotal = 0;
  private buildingsCreatedTotal = 0;
  private readonly mutationsTotal = new Map<string, number>();
  private readonly apiRequestsTotal = new Map<string, number>();
  private readonly apiDurationSeconds = new Map<
    string,
    { count: number; sumSeconds: number; maxSeconds: number }
  >();
  private readonly conflictsTotal = new Map<string, number>();

  recordSiteCreated(): void {
    this.sitesCreatedTotal += 1;
    this.recordMutation('site', 'create', 'success');
  }

  recordBuildingCreated(): void {
    this.buildingsCreatedTotal += 1;
    this.recordMutation('building', 'create', 'success');
  }

  recordMutation(
    resource: LocationMetricResource,
    action: LocationMetricAction,
    result: LocationMetricResult,
  ): void {
    const key = `${resource}|${action}|${result}`;
    this.mutationsTotal.set(key, (this.mutationsTotal.get(key) ?? 0) + 1);
  }

  recordConflict(
    resource: LocationMetricResource,
    reason: LocationConflictReason,
  ): void {
    const key = `${resource}|${reason}`;
    this.conflictsTotal.set(key, (this.conflictsTotal.get(key) ?? 0) + 1);
  }

  recordApiRequest(
    operation: LocationMetricOperation,
    statusCode: number,
    durationMs: number,
  ): void {
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    const reqKey = `${operation}|${statusClass}`;
    this.apiRequestsTotal.set(
      reqKey,
      (this.apiRequestsTotal.get(reqKey) ?? 0) + 1,
    );

    const seconds = Math.max(0, durationMs) / 1000;
    const prev = this.apiDurationSeconds.get(operation) ?? {
      count: 0,
      sumSeconds: 0,
      maxSeconds: 0,
    };
    this.apiDurationSeconds.set(operation, {
      count: prev.count + 1,
      sumSeconds: prev.sumSeconds + seconds,
      maxSeconds: Math.max(prev.maxSeconds, seconds),
    });
  }

  getSnapshot(): LocationMetricsSnapshot {
    return {
      gridaware_sites_created_total: this.sitesCreatedTotal,
      gridaware_buildings_created_total: this.buildingsCreatedTotal,
      gridaware_location_mutations_total: Object.fromEntries(
        this.mutationsTotal.entries(),
      ),
      gridaware_location_api_requests_total: Object.fromEntries(
        this.apiRequestsTotal.entries(),
      ),
      gridaware_location_api_duration_seconds: Object.fromEntries(
        Array.from(this.apiDurationSeconds.entries()).map(([k, v]) => [
          k,
          { ...v },
        ]),
      ),
      gridaware_location_conflicts_total: Object.fromEntries(
        this.conflictsTotal.entries(),
      ),
    };
  }

  reset(): void {
    this.sitesCreatedTotal = 0;
    this.buildingsCreatedTotal = 0;
    this.mutationsTotal.clear();
    this.apiRequestsTotal.clear();
    this.apiDurationSeconds.clear();
    this.conflictsTotal.clear();
  }
}
