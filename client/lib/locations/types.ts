export type SiteType =
  | "FACTORY"
  | "INDUSTRIAL_FACILITY"
  | "COMMERCIAL_COMPLEX"
  | "COMMERCIAL_PROPERTY"
  | "CAMPUS"
  | "WAREHOUSE_CAMPUS"
  | "OTHER";

export type BuildingType =
  | "PRODUCTION"
  | "OFFICE"
  | "WAREHOUSE"
  | "UTILITY"
  | "RETAIL"
  | "PLANT_ROOM"
  | "PARKING"
  | "OTHER";

export type LocationStatus = "ACTIVE" | "INACTIVE";
export type LocationSortField = "createdAt" | "name" | "code";
export type LocationSortDirection = "asc" | "desc";

export const SITE_TYPE_LABELS: Readonly<Record<SiteType, string>> = {
  FACTORY: "Factory",
  INDUSTRIAL_FACILITY: "Industrial Facility",
  COMMERCIAL_COMPLEX: "Commercial Complex",
  COMMERCIAL_PROPERTY: "Commercial Property",
  CAMPUS: "Campus",
  WAREHOUSE_CAMPUS: "Warehouse Campus",
  OTHER: "Other",
};

export const BUILDING_TYPE_LABELS: Readonly<Record<BuildingType, string>> = {
  PRODUCTION: "Production",
  OFFICE: "Office",
  WAREHOUSE: "Warehouse",
  UTILITY: "Utility",
  RETAIL: "Retail",
  PLANT_ROOM: "Plant Room",
  PARKING: "Parking",
  OTHER: "Other",
};

export interface SiteDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: SiteType;
  description: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timeZone: string;
  status: LocationStatus;
  archivedAt: string | null;
  buildingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BuildingDto {
  id: string;
  organizationId: string;
  siteId: string;
  code: string;
  name: string;
  type: BuildingType;
  description: string | null;
  floorCount: number | null;
  grossAreaSqM: string | null;
  status: LocationStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListLocationsQuery {
  cursor?: string;
  limit?: number;
  q?: string;
  status?: LocationStatus;
  sort?: LocationSortField;
  direction?: LocationSortDirection;
  includeArchived?: boolean;
}

export interface CreateSitePayload {
  code: string;
  name: string;
  type: SiteType;
  description?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timeZone?: string;
}

export interface UpdateSitePayload {
  name?: string;
  type?: SiteType;
  description?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timeZone?: string;
}

export interface CreateBuildingPayload {
  code: string;
  name: string;
  type: BuildingType;
  description?: string | null;
  floorCount?: number | null;
  grossAreaSqM?: string | null;
}

export interface UpdateBuildingPayload {
  name?: string;
  type?: BuildingType;
  description?: string | null;
  floorCount?: number | null;
  grossAreaSqM?: string | null;
}
