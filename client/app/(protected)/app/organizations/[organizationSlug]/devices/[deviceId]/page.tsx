'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, KeyRound, Radio, ShieldCheck } from 'lucide-react';
import {
  DeviceLifecycleBadge,
  DeviceProvenanceBadge,
  FreshnessBadge,
} from '@/components/devices/status-badges';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getDevice,
  listDeviceAssignedSensors,
  listDeviceAuditLogs,
  listDeviceCredentials,
  type AuditLogRecord,
  type CredentialMetadataRecord,
  type DeviceRecord,
} from '@/lib/api/devices';

export default function DeviceDetailPage() {
  const params = useParams<{ organizationSlug: string; deviceId: string }>();
  const orgSlug = params?.organizationSlug ?? '';
  const deviceId = params?.deviceId ?? '';

  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [credentials, setCredentials] = useState<CredentialMetadataRecord[]>([]);
  const [assignedSensors, setAssignedSensors] = useState<
    Array<{
      id: string;
      assignedAt: string;
      sensor: { id: string; name: string; sensorKey: string; status: string };
    }>
  >([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug || !deviceId) return;
    let active = true;
    setLoading(true);
    Promise.all([
      getDevice(orgSlug, deviceId),
      listDeviceCredentials(orgSlug, deviceId).catch(() => []),
      listDeviceAssignedSensors(orgSlug, deviceId).catch(() => []),
      listDeviceAuditLogs(orgSlug, deviceId).catch(() => []),
    ])
      .then(([d, creds, sensors, logs]) => {
        if (!active) return;
        setDevice(d);
        setCredentials(creds);
        setAssignedSensors(sensors);
        setAuditLogs(logs);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orgSlug, deviceId]);

  if (loading) {
    return (
      <main className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (error || !device) {
    return (
      <main className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={`/app/organizations/${orgSlug}/devices`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Devices
        </Link>
        <div
          role="alert"
          className="rounded-[var(--radius-card)] border p-4 text-sm"
          style={{
            color: 'var(--status-critical)',
            backgroundColor: 'var(--status-critical-bg)',
            borderColor: 'var(--status-critical-border)',
          }}
        >
          {error ?? 'Device not found'}
        </div>
      </main>
    );
  }

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-3 border-b border-[var(--border-subtle)] pb-5">
        <Link
          href={`/app/organizations/${orgSlug}/devices`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Devices
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
              {device.name}
            </h1>
            <p className="font-mono text-xs text-[var(--text-muted)]">{device.deviceKey}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DeviceProvenanceBadge type={device.deviceType} />
            <DeviceLifecycleBadge status={device.status} />
            <FreshnessBadge state={device.connectionState} />
          </div>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-strong)]">Identity & Telemetry Context</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {device.description ?? 'No administrative description recorded.'}
          </p>
          <dl className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div>
              <dt className="text-[var(--text-muted)]">Last Seen</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-[var(--text-primary)]">
                {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never connected'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Firmware</dt>
              <dd className="mt-0.5 font-mono text-[var(--text-primary)]">
                {device.firmwareVersion ?? '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[var(--text-strong)]">
              Authorized MQTT Topics (Publish-Only)
            </h2>
          </div>
          <ul className="space-y-1.5 font-mono text-xs text-[var(--text-secondary)]">
            {(device.mqtt?.publishTopics ?? []).map((topic) => (
              <li
                key={topic}
                className="break-all rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/70 px-3 py-1.5"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--text-strong)]">
            Credential Metadata (Secrets Never Stored in Plaintext)
          </h2>
        </div>
        {credentials.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No credentials provisioned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-4">Version</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Issued</th>
                  <th className="py-2">Revoked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {credentials.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-[var(--text-strong)]">
                      v{c.credentialVersion}
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{c.credentialType}</td>
                    <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">{c.status}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-[var(--text-secondary)]">
                      {new Date(c.issuedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-mono tabular-nums text-[var(--text-secondary)]">
                      {c.revokedAt ? new Date(c.revokedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-strong)]">Assigned Sensors</h2>
          {assignedSensors.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No sensors assigned to this device.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)] text-xs">
              {assignedSensors.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <Link
                    href={`/app/organizations/${orgSlug}/sensors/${a.sensor.id}`}
                    className="font-medium text-[var(--text-strong)] hover:text-[var(--accent-ink)] hover:underline"
                  >
                    {a.sensor.name}{' '}
                    <span className="font-mono text-[var(--text-muted)]">({a.sensor.sensorKey})</span>
                  </Link>
                  <span className="text-[var(--text-secondary)]">{a.sensor.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[var(--text-strong)]">Audit History</h2>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No audit entries available.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)] text-xs">
              {auditLogs.map((log) => (
                <li key={log.id} className="flex items-center justify-between py-2.5">
                  <span className="font-mono text-[var(--text-primary)]">{log.action}</span>
                  <span className="font-mono tabular-nums text-[var(--text-muted)]">
                    {new Date(log.occurredAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
