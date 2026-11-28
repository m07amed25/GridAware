import { apiRequest } from '@/lib/auth/client';

export type DerivedFreshnessState =
  | 'ONLINE'
  | 'STALE'
  | 'OFFLINE'
  | 'UNKNOWN'
  | 'MAINTENANCE';

export interface DeviceRecord {
  id: string;
  organizationId: string;
  deviceKey: string;
  name: string;
  description: string | null;
  deviceType: 'GATEWAY' | 'SIMULATOR' | 'EDGE_CONTROLLER' | 'OTHER';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'RETIRED';
  connectionState: DerivedFreshnessState;
  firmwareVersion: string | null;
  lastSeenAt: string | null;
  site?: { id: string; name: string; code: string } | null;
  asset?: { id: string; name: string; assetCode: string } | null;
  mqtt?: { publishTopics: string[] };
}

export interface ProvisioningResponse {
  deviceId: string;
  deviceKey: string;
  status: string;
  credential: {
    id: string;
    version: number;
    username: string;
    password: string;
    expiresAt: string | null;
  };
  mqtt: {
    brokerUrl: string;
    publishTopics: string[];
  };
}

export async function listDevices(
  organizationSlug: string,
  params?: Record<string, string>,
) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await apiRequest<{
    items: DeviceRecord[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(`/organizations/${encodeURIComponent(organizationSlug)}/devices${qs}`);
  return res.data;
}

export async function createDevice(
  organizationSlug: string,
  payload: {
    deviceKey: string;
    name: string;
    deviceType: DeviceRecord['deviceType'];
    description?: string;
    serialNumber?: string;
  },
) {
  const res = await apiRequest<DeviceRecord>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function provisionDevice(
  organizationSlug: string,
  deviceId: string,
) {
  const res = await apiRequest<ProvisioningResponse>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}/provision`,
    { method: 'POST' },
  );
  return res.data;
}

export async function rotateDeviceCredentials(
  organizationSlug: string,
  deviceId: string,
) {
  const res = await apiRequest<ProvisioningResponse>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}/rotate-credentials`,
    { method: 'POST' },
  );
  return res.data;
}

export async function runDeviceAction(
  organizationSlug: string,
  deviceId: string,
  action: 'activate' | 'suspend' | 'reactivate' | 'revoke' | 'retire',
) {
  const res = await apiRequest<DeviceRecord>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}/${action}`,
    { method: 'POST' },
  );
  return res.data;
}

export interface CredentialMetadataRecord {
  id: string;
  credentialVersion: number;
  credentialType: string;
  status: string;
  issuedAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
}

export async function getDevice(organizationSlug: string, deviceId: string) {
  const res = await apiRequest<DeviceRecord>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}`,
  );
  return res.data;
}

export async function listDeviceCredentials(
  organizationSlug: string,
  deviceId: string,
) {
  const res = await apiRequest<CredentialMetadataRecord[]>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}/credentials`,
  );
  return res.data;
}

export async function listDeviceAssignedSensors(
  organizationSlug: string,
  deviceId: string,
) {
  const res = await apiRequest<
    Array<{
      id: string;
      assignedAt: string;
      sensor: {
        id: string;
        name: string;
        sensorKey: string;
        status: string;
        asset?: { name: string; assetCode: string } | null;
      };
    }>
  >(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}/sensors`,
  );
  return res.data;
}

export async function listDeviceAuditLogs(
  organizationSlug: string,
  deviceId: string,
) {
  const res = await apiRequest<AuditLogRecord[]>(
    `/organizations/${encodeURIComponent(organizationSlug)}/devices/${encodeURIComponent(deviceId)}/audit-logs`,
  );
  return res.data;
}
