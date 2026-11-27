import { apiRequest } from "../auth/client";
import type { ApiEnvelope } from "../auth/types";
import type { PaginatedApiEnvelope } from "../authorization/types";
import type {
  BuildingDto,
  CreateBuildingPayload,
  CreateSitePayload,
  ListLocationsQuery,
  SiteDto,
  UpdateBuildingPayload,
  UpdateSitePayload,
} from "./types";

function buildListQueryString(params?: ListLocationsQuery): string {
  const qs = new URLSearchParams();
  if (params?.cursor) qs.set("cursor", params.cursor);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.q && params.q.trim().length > 0) qs.set("q", params.q.trim());
  if (params?.status) qs.set("status", params.status);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.direction) qs.set("direction", params.direction);
  if (params?.includeArchived) qs.set("includeArchived", "true");
  const serialized = qs.toString();
  return serialized ? `?${serialized}` : "";
}

function orgPath(organizationId: string): string {
  return `/organizations/${encodeURIComponent(organizationId)}`;
}

// --- Sites (8 endpoints) ---

export function listSites(
  organizationId: string,
  params?: ListLocationsQuery,
): Promise<PaginatedApiEnvelope<SiteDto>> {
  return apiRequest<SiteDto[]>(
    `${orgPath(organizationId)}/sites${buildListQueryString(params)}`,
    { method: "GET" },
  ) as unknown as Promise<PaginatedApiEnvelope<SiteDto>>;
}

export function createSite(
  organizationId: string,
  payload: CreateSitePayload,
): Promise<ApiEnvelope<SiteDto>> {
  return apiRequest<SiteDto>(`${orgPath(organizationId)}/sites`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSite(
  organizationId: string,
  siteId: string,
  options?: { includeArchived?: boolean },
): Promise<ApiEnvelope<SiteDto>> {
  const qs = options?.includeArchived ? "?includeArchived=true" : "";
  return apiRequest<SiteDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}${qs}`,
    { method: "GET" },
  );
}

export function updateSite(
  organizationId: string,
  siteId: string,
  payload: UpdateSitePayload,
): Promise<ApiEnvelope<SiteDto>> {
  return apiRequest<SiteDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function activateSite(
  organizationId: string,
  siteId: string,
): Promise<ApiEnvelope<SiteDto>> {
  return apiRequest<SiteDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/activate`,
    { method: "POST" },
  );
}

export function deactivateSite(
  organizationId: string,
  siteId: string,
): Promise<ApiEnvelope<SiteDto>> {
  return apiRequest<SiteDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/deactivate`,
    { method: "POST" },
  );
}

export function archiveSite(
  organizationId: string,
  siteId: string,
): Promise<ApiEnvelope<SiteDto>> {
  return apiRequest<SiteDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/archive`,
    { method: "POST" },
  );
}

export function restoreSite(
  organizationId: string,
  siteId: string,
): Promise<ApiEnvelope<SiteDto>> {
  return apiRequest<SiteDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/restore`,
    { method: "POST" },
  );
}

// --- Buildings (8 endpoints) ---

export function listBuildings(
  organizationId: string,
  siteId: string,
  params?: ListLocationsQuery,
): Promise<PaginatedApiEnvelope<BuildingDto>> {
  return apiRequest<BuildingDto[]>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/buildings${buildListQueryString(params)}`,
    { method: "GET" },
  ) as unknown as Promise<PaginatedApiEnvelope<BuildingDto>>;
}

export function createBuilding(
  organizationId: string,
  siteId: string,
  payload: CreateBuildingPayload,
): Promise<ApiEnvelope<BuildingDto>> {
  return apiRequest<BuildingDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/buildings`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getBuilding(
  organizationId: string,
  siteId: string,
  buildingId: string,
  options?: { includeArchived?: boolean },
): Promise<ApiEnvelope<BuildingDto>> {
  const qs = options?.includeArchived ? "?includeArchived=true" : "";
  return apiRequest<BuildingDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/buildings/${encodeURIComponent(buildingId)}${qs}`,
    { method: "GET" },
  );
}

export function updateBuilding(
  organizationId: string,
  siteId: string,
  buildingId: string,
  payload: UpdateBuildingPayload,
): Promise<ApiEnvelope<BuildingDto>> {
  return apiRequest<BuildingDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/buildings/${encodeURIComponent(buildingId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function activateBuilding(
  organizationId: string,
  siteId: string,
  buildingId: string,
): Promise<ApiEnvelope<BuildingDto>> {
  return apiRequest<BuildingDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/buildings/${encodeURIComponent(buildingId)}/activate`,
    { method: "POST" },
  );
}

export function deactivateBuilding(
  organizationId: string,
  siteId: string,
  buildingId: string,
): Promise<ApiEnvelope<BuildingDto>> {
  return apiRequest<BuildingDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/buildings/${encodeURIComponent(buildingId)}/deactivate`,
    { method: "POST" },
  );
}

export function archiveBuilding(
  organizationId: string,
  siteId: string,
  buildingId: string,
): Promise<ApiEnvelope<BuildingDto>> {
  return apiRequest<BuildingDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/buildings/${encodeURIComponent(buildingId)}/archive`,
    { method: "POST" },
  );
}

export function restoreBuilding(
  organizationId: string,
  siteId: string,
  buildingId: string,
): Promise<ApiEnvelope<BuildingDto>> {
  return apiRequest<BuildingDto>(
    `${orgPath(organizationId)}/sites/${encodeURIComponent(siteId)}/buildings/${encodeURIComponent(buildingId)}/restore`,
    { method: "POST" },
  );
}
