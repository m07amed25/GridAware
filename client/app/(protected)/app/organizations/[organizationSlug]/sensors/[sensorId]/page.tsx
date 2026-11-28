'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import {
  FreshnessBadge,
  SensorLifecycleBadge,
} from '@/components/devices/status-badges';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getSensor,
  listSensorAuditLogs,
  type SensorRecord,
} from '@/lib/api/sensors';

export default function SensorDetailPage() {
  const params = useParams<{ organizationSlug: string; sensorId: string }>();
  const orgSlug = params?.organizationSlug ?? '';
  const sensorId = params?.sensorId ?? '';

  const [sensor, setSensor] = useState<SensorRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<
    Array<{ id: string; action: string; occurredAt: string }>
  >([]);
  const [loadedRequestKey, setLoadedRequestKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const requestKey = `${orgSlug}:${sensorId}`;
  const loading = loadedRequestKey !== requestKey;

  useEffect(() => {
    if (!orgSlug || !sensorId) return;
    let active = true;
    Promise.all([
      getSensor(orgSlug, sensorId),
      listSensorAuditLogs(orgSlug, sensorId).catch(() => []),
    ])
      .then(([s, logs]) => {
        if (!active) return;
        setSensor(s);
        setAuditLogs(logs);
        setError(null);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [orgSlug, sensorId, requestKey]);

  if (loading) {
    return (
      <main className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (error || !sensor) {
    return (
      <main className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={`/app/organizations/${orgSlug}/sensors`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Sensors
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
          {error ?? 'Sensor not found'}
        </div>
      </main>
    );
  }

  const assignedDevice = sensor.assignments?.[0]?.device;

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-3 border-b border-[var(--border-subtle)] pb-5">
        <Link
          href={`/app/organizations/${orgSlug}/sensors`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Sensors
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
              {sensor.name}
            </h1>
            <p className="font-mono text-xs text-[var(--text-muted)]">{sensor.sensorKey}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SensorLifecycleBadge status={sensor.status} />
            <FreshnessBadge state={sensor.freshnessState} />
          </div>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-strong)]">Asset & Reporting</h2>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-[var(--text-muted)]">Asset</dt>
              <dd className="mt-0.5 text-[var(--text-strong)]">{sensor.asset?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Sensor Type</dt>
              <dd className="mt-0.5 text-[var(--text-primary)]">{sensor.sensorType}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Expected Interval</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-[var(--text-primary)]">
                {sensor.expectedReportingIntervalSeconds
                  ? `${sensor.expectedReportingIntervalSeconds}s`
                  : 'Default (60s)'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Last Reading</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-[var(--text-primary)]">
                {sensor.lastReadingAt ? new Date(sensor.lastReadingAt).toLocaleString() : 'Never'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-strong)]">
            Device Assignment & Metrics
          </h2>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-[var(--text-muted)]">Publisher Device</dt>
              <dd className="mt-0.5">
                {assignedDevice ? (
                  <Link
                    href={`/app/organizations/${orgSlug}/devices/${assignedDevice.id}`}
                    className="font-mono text-[var(--accent-ink)] hover:underline"
                  >
                    {assignedDevice.name} ({assignedDevice.deviceKey})
                  </Link>
                ) : (
                  <span className="text-[var(--text-secondary)]">Unassigned</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Configured Metrics</dt>
              <dd className="mt-0.5 font-mono text-[var(--text-primary)]">
                {sensor.metrics && sensor.metrics.length > 0
                  ? sensor.metrics.map((m) => `${m.metricKey} (${m.unit})`).join(', ')
                  : 'Not configured'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
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
      </section>
    </main>
  );
}
