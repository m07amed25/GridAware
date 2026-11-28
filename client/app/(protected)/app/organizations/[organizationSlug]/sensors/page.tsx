'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ChevronRight,
  Link2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOptionalAccessContext } from '@/components/authorization/access-context-provider';
import {
  FreshnessBadge,
  SensorLifecycleBadge,
} from '@/components/devices/status-badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { listDevices, type DeviceRecord } from '@/lib/api/devices';
import {
  assignSensorToDevice,
  createAsset,
  createSensor,
  listAssets,
  listMetricDefinitions,
  listSensors,
  listSitesSummary,
  replaceSensorMetrics,
  runSensorAction,
  unassignSensorFromDevice,
  type AssetRecord,
  type MetricDefinitionRecord,
  type SensorRecord,
  type SiteSummary,
} from '@/lib/api/sensors';

export default function SensorsPage() {
  const params = useParams<{ organizationSlug: string }>();
  const orgSlug = params?.organizationSlug ?? '';
  const access = useOptionalAccessContext();
  const canCreate = access?.permissions.has('sensors:create') ?? false;
  const canUpdate = access?.permissions.has('sensors:update') ?? false;
  const canMaintenance = access?.permissions.has('sensors:maintenance') ?? false;
  const canDisable = access?.permissions.has('sensors:disable') ?? false;

  const [sensors, setSensors] = useState<SensorRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [confirmRetire, setConfirmRetire] = useState<SensorRecord | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [sensorKey, setSensorKey] = useState('');
  const [name, setName] = useState('');
  const [sensorType, setSensorType] = useState('temperature');
  const [intervalSec, setIntervalSec] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  const [showQuickAsset, setShowQuickAsset] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [assetCode, setAssetCode] = useState('GEN-001');
  const [assetName, setAssetName] = useState('Backup Generator 001');

  const [metricSensor, setMetricSensor] = useState<SensorRecord | null>(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState('temperature');
  const [selectedUnit, setSelectedUnit] = useState('°C');

  const [assignSensor, setAssignSensor] = useState<SensorRecord | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const refresh = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = { page: String(page), pageSize: '25' };
      if (search.trim()) query.search = search.trim();
      if (statusFilter) query.status = statusFilter;
      const [sensorData, assetList, siteList, deviceData, metricList] = await Promise.all([
        listSensors(orgSlug, query),
        listAssets(orgSlug).catch(() => []),
        listSitesSummary(orgSlug).catch(() => []),
        listDevices(orgSlug).catch(() => ({ items: [] })),
        listMetricDefinitions(orgSlug).catch(() => []),
      ]);
      setSensors(sensorData.items);
      setTotalCount(sensorData.pagination.total);
      setTotalPages(Math.max(1, sensorData.pagination.totalPages));
      setAssets(assetList);
      setSites(siteList);
      setDevices(deviceData.items);
      setMetrics(metricList);
      if (assetList.length > 0 && !assetId) setAssetId(assetList[0].id);
      if (siteList.length > 0 && !siteId) setSiteId(siteList[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sensors');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, assetId, siteId, page, search, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleQuickCreateAsset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await createAsset(orgSlug, {
        siteId,
        assetCode,
        name: assetName,
        assetType: 'GENERATOR',
      });
      setAssets((prev) => [created, ...prev]);
      setAssetId(created.id);
      setShowQuickAsset(false);
      toast.success(`Created asset "${created.name}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create asset';
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createSensor(orgSlug, {
        assetId,
        sensorKey,
        name,
        sensorType,
        expectedReportingIntervalSeconds: Number(intervalSec) || 30,
      });
      toast.success(`Registered sensor "${name}" in PLANNED status.`);
      setShowRegister(false);
      setSensorKey('');
      setName('');
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to register sensor';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveMetric(e: React.FormEvent) {
    e.preventDefault();
    if (!metricSensor) return;
    setBusyId(metricSensor.id);
    setError(null);
    try {
      await replaceSensorMetrics(orgSlug, metricSensor.id, [
        { metricKey: selectedMetricKey, unit: selectedUnit, isPrimary: true },
      ]);
      toast.success(`Configured ${selectedMetricKey} (${selectedUnit}).`);
      setMetricSensor(null);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save metric';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAssignDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!assignSensor || !selectedDeviceId) return;
    setBusyId(assignSensor.id);
    setError(null);
    try {
      await assignSensorToDevice(orgSlug, selectedDeviceId, assignSensor.id);
      toast.success('Assigned sensor to device.');
      setAssignSensor(null);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to assign device';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnassign(deviceId: string, sensorId: string) {
    setBusyId(sensorId);
    setError(null);
    try {
      await unassignSensorFromDevice(orgSlug, deviceId, sensorId);
      toast.success('Unassigned sensor from device.');
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to unassign device';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAction(
    sensorId: string,
    action: 'activate' | 'maintenance' | 'disable' | 'enable' | 'retire',
  ) {
    setBusyId(sensorId);
    setError(null);
    try {
      await runSensorAction(orgSlug, sensorId, action);
      toast.success(`Sensor updated (${action}).`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to ${action} sensor`;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  const activeMetricDef = metrics.find((m) => m.key === selectedMetricKey);

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
            Sensors
          </h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Asset measurement sources, canonical metric definitions, publisher device assignments, and maintenance states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
          {canCreate && (
            <Button type="button" size="sm" onClick={() => setShowRegister(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Register Sensor
            </Button>
          )}
        </div>
      </header>

      <section
        aria-label="Sensor filters"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64 sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search sensor name or key..."
              className="pl-9"
              aria-label="Search sensors"
            />
          </div>
          <Select
            value={statusFilter || 'ALL'}
            onValueChange={(val) => {
              setStatusFilter(val === 'ALL' ? '' : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[155px]" aria-label="Filter by sensor status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PLANNED">Planned</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
              <SelectItem value="RETIRED">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs tabular-nums text-[var(--text-muted)]">
          {loading ? 'Loading…' : `${totalCount} ${totalCount === 1 ? 'sensor' : 'sensors'}`}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--radius-card)] border p-4 text-sm"
          style={{
            color: 'var(--status-critical)',
            backgroundColor: 'var(--status-critical-bg)',
            borderColor: 'var(--status-critical-border)',
          }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">{error}</div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : sensors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]">
            <Activity className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            {search || statusFilter ? 'No matching sensors' : 'No sensors registered'}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-[var(--text-secondary)]">
            {search || statusFilter
              ? 'Try clearing your search or status filter.'
              : 'Register a sensor under an organization asset, bind a canonical metric, and assign it to an active device.'}
          </p>
          {canCreate && !search && !statusFilter && (
            <Button type="button" className="mt-6" onClick={() => setShowRegister(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Register your first sensor
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/60 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3.5">Sensor</th>
                  <th className="px-4 py-3.5">Asset</th>
                  <th className="px-4 py-3.5">Publisher Device</th>
                  <th className="px-4 py-3.5">Metric</th>
                  <th className="px-4 py-3.5">Lifecycle</th>
                  <th className="px-4 py-3.5">Freshness</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sensors.map((sensor) => {
                  const primaryMetric = sensor.metrics?.[0];
                  const assignedDevice = sensor.assignments?.[0]?.device;
                  return (
                    <tr
                      key={sensor.id}
                      className="transition-colors hover:bg-[var(--surface-2)]/60"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/app/organizations/${orgSlug}/sensors/${sensor.id}`}
                          className="group inline-flex items-center gap-1.5 font-medium text-[var(--text-strong)] hover:text-[var(--accent-ink)]"
                        >
                          {sensor.name}
                          <ChevronRight
                            className="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-ink)]"
                            aria-hidden="true"
                          />
                        </Link>
                        <div className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
                          {sensor.sensorKey}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text-secondary)]">
                        {sensor.asset?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--text-secondary)]">
                        {assignedDevice ? (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/app/organizations/${orgSlug}/devices/${assignedDevice.id}`}
                              className="text-[var(--text-primary)] hover:text-[var(--accent-ink)] hover:underline"
                            >
                              {assignedDevice.deviceKey}
                            </Link>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => void handleUnassign(assignedDevice.id, sensor.id)}
                                className="font-sans text-[11px] text-[var(--status-critical)] hover:underline"
                              >
                                Unassign
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="font-sans text-[var(--text-muted)]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--text-primary)]">
                        {primaryMetric
                          ? `${primaryMetric.metricKey} (${primaryMetric.unit})`
                          : <span className="font-sans text-[var(--text-muted)]">Not configured</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <SensorLifecycleBadge status={sensor.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <FreshnessBadge state={sensor.freshnessState} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {canUpdate && sensor.status !== 'RETIRED' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMetricSensor(sensor);
                                const def = metrics[0];
                                if (def) {
                                  setSelectedMetricKey(def.key);
                                  setSelectedUnit(def.canonicalUnit);
                                }
                              }}
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                              Metric
                            </Button>
                          )}
                          {canUpdate && !assignedDevice && sensor.status !== 'RETIRED' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAssignSensor(sensor);
                                setSelectedDeviceId(devices[0]?.id ?? '');
                              }}
                            >
                              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Assign
                            </Button>
                          )}
                          {sensor.status === 'PLANNED' && canUpdate && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyId === sensor.id}
                              onClick={() => void handleAction(sensor.id, 'activate')}
                            >
                              Activate
                            </Button>
                          )}
                          {sensor.status === 'ACTIVE' && canMaintenance && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === sensor.id}
                              onClick={() => void handleAction(sensor.id, 'maintenance')}
                            >
                              Maintenance
                            </Button>
                          )}
                          {sensor.status === 'ACTIVE' && canDisable && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === sensor.id}
                              onClick={() => void handleAction(sensor.id, 'disable')}
                            >
                              Disable
                            </Button>
                          )}
                          {(sensor.status === 'MAINTENANCE' || sensor.status === 'DISABLED') && canUpdate && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyId === sensor.id}
                              onClick={() => void handleAction(sensor.id, 'enable')}
                            >
                              Enable
                            </Button>
                          )}
                          {sensor.status !== 'RETIRED' && canUpdate && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busyId === sensor.id}
                              onClick={() => setConfirmRetire(sensor)}
                            >
                              Retire
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-5 py-3 text-xs text-[var(--text-secondary)]">
              <span className="tabular-nums">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showRegister && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md space-y-5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-2)] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
              Register Sensor
            </h2>
            {showQuickAsset ? (
              <form
                onSubmit={handleQuickCreateAsset}
                className="space-y-3.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"
              >
                <p className="text-xs font-semibold text-[var(--accent-ink)]">
                  Create Asset under a Site
                </p>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="w-full" aria-label="Site">
                    <SelectValue placeholder="Select a site…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  required
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="GEN-001"
                  className="font-mono"
                />
                <Input
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Backup Generator 001"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowQuickAsset(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Save Asset
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--text-primary)]">Asset</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAsset(true)}
                      className="text-xs font-medium text-[var(--accent-ink)] hover:underline"
                    >
                      + New Asset
                    </button>
                  </div>
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger className="w-full" aria-label="Asset">
                      <SelectValue placeholder="Select an asset…" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.assetCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Coolant Temperature Probe"
                />
                <Input
                  required
                  value={sensorKey}
                  onChange={(e) => setSensorKey(e.target.value)}
                  placeholder="gen-001-engine-temperature"
                  className="font-mono"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <Input
                    required
                    value={sensorType}
                    onChange={(e) => setSensorType(e.target.value)}
                    placeholder="temperature"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={intervalSec}
                    onChange={(e) => setIntervalSec(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowRegister(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !assetId}>
                    {submitting ? 'Registering…' : 'Register Sensor'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {metricSensor && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSaveMetric}
            className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-2)] p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Configure Metric — {metricSensor.name}
            </h2>
            <Select
              value={selectedMetricKey}
              onValueChange={(val) => {
                setSelectedMetricKey(val);
                const def = metrics.find((m) => m.key === val);
                if (def) setSelectedUnit(def.canonicalUnit);
              }}
            >
              <SelectTrigger className="w-full" aria-label="Metric">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.displayName} ({m.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-full" aria-label="Unit">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {(activeMetricDef?.supportedUnits ?? ['°C']).map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setMetricSensor(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Metric</Button>
            </div>
          </form>
        </div>
      )}

      {assignSensor && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleAssignDevice}
            className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-2)] p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Assign Publisher Device — {assignSensor.name}
            </h2>
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="w-full" aria-label="Publisher device">
                <SelectValue placeholder="Select a device…" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.deviceKey})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAssignSensor(null)}>
                Cancel
              </Button>
              <Button type="submit">Assign Device</Button>
            </div>
          </form>
        </div>
      )}

      {confirmRetire && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-[var(--status-critical-border)] bg-[var(--surface-2)] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Confirm permanent retirement
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Retiring <strong className="text-[var(--text-strong)]">{confirmRetire.name}</strong>{' '}
              (<span className="font-mono text-xs">{confirmRetire.sensorKey}</span>) is permanent and cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setConfirmRetire(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  const target = confirmRetire;
                  setConfirmRetire(null);
                  await handleAction(target.id, 'retire');
                }}
              >
                Confirm retire
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
