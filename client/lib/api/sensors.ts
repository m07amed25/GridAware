import { apiRequest } from '@/lib/auth/client';
import type { DerivedFreshnessState } from './devices';

export interface AssetRecord {
  id: string;
  siteId: string;
  assetCode: string;
  name: string;
  assetType: string;
  status: string;
}

export interface SiteSummary {
  id: string;
  code: string;
  name: string;
}

export interface MetricDefinitionRecord {
  key: string;
  displayName: string;
  description: string;
  dimension: string;
  canonicalUnit: string;
  supportedUnits: string[];
}

export interface SensorRecord {
  id: string;
  organizationId: string;
  assetId: string;
  sensorKey: string;
  name: string;
  sensorType: string;
  status: 'PLANNED' | 'ACTIVE' | 'MAINTENANCE' | 'DISABLED' | 'RETIRED';
  freshnessState: DerivedFreshnessState;
  expectedReportingIntervalSeconds: number | null;
  lastReadingAt: string | null;
  asset?: { id: string; name: string; assetCode: string } | null;
  metrics?: Array<{ metricKey: string; unit: string; isPrimary: boolean }>;
  assignments?: Array<{ device: { id: string; name: string; deviceKey: string } }>;
}

export async function listSensors(
  organizationSlug: string,
  params?: Record<string, string>,
) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await apiRequest<{
    items: SensorRecord[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(`/organizations/${encodeURIComponent(organizationSlug)}/sensors${qs}`);
  return res.data;
}

export async function listAssets(organizationSlug: string) {
  const res = await apiRequest<{ items: AssetRecord[] }>(
    `/organizations/${encodeURIComponent(organizationSlug)}/assets?pageSize=100`,
  );
  return res.data.items;
}

export async function createAsset(
  organizationSlug: string,
  payload: { siteId: string; assetCode: string; name: string; assetType: string },
) {
  const res = await apiRequest<AssetRecord>(
    `/organizations/${encodeURIComponent(organizationSlug)}/assets`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function listSitesSummary(organizationSlug: string) {
  const res = await apiRequest<SiteSummary[]>(
    `/organizations/${encodeURIComponent(organizationSlug)}/sites`,
  );
  return res.data;
}

export async function listMetricDefinitions(organizationSlug: string) {
  const res = await apiRequest<MetricDefinitionRecord[]>(
    `/organizations/${encodeURIComponent(organizationSlug)}/metric-definitions`,
  );
  return res.data;
}

export async function createSensor(
  organizationSlug: string,
  payload: {
    assetId: string;
    sensorKey: string;
    name: string;
    sensorType: string;
    expectedReportingIntervalSeconds?: number;
  },
) {
  const res = await apiRequest<SensorRecord>(
    `/organizations/${encodeURIComponent(organizationSlug)}/sensors`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function replaceSensorMetrics(
  organizationSlug: string,
  sensorId: string,
  metrics: Array<{
    metricKey: string;
    unit: string;
    minPlausibleValue?: number | null;
    maxPlausibleValue?: number | null;
    isPrimary: boolean;
  }>,
) {
  const res = await apiRequest<unknown>(
    `/organizations/${encodeURIComponent(organizationSlug)}/sensors/${encodeURIComponent(sensorId)}/metrics`,
    { method: 'PUT', body: JSON.stringify({ metrics }) },
  );
  return res.data;
}

export async function assignSensorToDevice(
  organizationSlug: string,
  deviceId: string,
  sensorId: string,
) {
  await apiRequest<unknown>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}/sensors/${encodeURIComponent(sensorId)}`,
    { method: 'POST' },
  );
}

export async function unassignSensorFromDevice(
  organizationSlug: string,
  deviceId: string,
  sensorId: string,
) {
  await apiRequest<unknown>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}/sensors/${encodeURIComponent(sensorId)}`,
    { method: 'DELETE' },
  );
}

export async function runSensorAction(
  organizationSlug: string,
  sensorId: string,
  action: 'activate' | 'maintenance' | 'disable' | 'enable' | 'retire',
) {
  const res = await apiRequest<SensorRecord>(
    `/organizations/${encodeURIComponent(organizationSlug)}/sensors/${encodeURIComponent(sensorId)}/${action}`,
    { method: 'POST' },
  );
  return res.data;
}

export async function getSensor(organizationSlug: string, sensorId: string) {
  const res = await apiRequest<SensorRecord>(
    `/organizations/${encodeURIComponent(organizationSlug)}/sensors/${encodeURIComponent(sensorId)}`,
  );
  return res.data;
}

export async function listSensorAuditLogs(
  organizationSlug: string,
  sensorId: string,
) {
  const res = await apiRequest<
    Array<{
      id: string;
      action: string;
      entityType: string;
      metadata: Record<string, unknown> | null;
      occurredAt: string;
    }>
  >(
    `/organizations/${encodeURIComponent(organizationSlug)}/sensors/${encodeURIComponent(sensorId)}/audit-logs`,
  );
  return res.data;
}
