'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOptionalAccessContext } from '@/components/authorization/access-context-provider';
import {
  DeviceLifecycleBadge,
  DeviceProvenanceBadge,
  FreshnessBadge,
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
import {
  createDevice,
  listDevices,
  provisionDevice,
  rotateDeviceCredentials,
  runDeviceAction,
  type DeviceRecord,
  type ProvisioningResponse,
} from '@/lib/api/devices';

export default function DevicesPage() {
  const params = useParams<{ organizationSlug: string }>();
  const orgSlug = params?.organizationSlug ?? '';
  const access = useOptionalAccessContext();
  const canCreate = access?.permissions.has('devices:create') ?? false;
  const canProvision = access?.permissions.has('device-credentials:provision') ?? false;
  const canActivate = access?.permissions.has('devices:activate') ?? false;
  const canSuspend = access?.permissions.has('devices:suspend') ?? false;
  const canRotate = access?.permissions.has('devices:rotate-credentials') ?? false;
  const canRevoke = access?.permissions.has('devices:revoke') ?? false;

  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    device: DeviceRecord;
    action: 'revoke' | 'retire';
  } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loadedRequestKey, setLoadedRequestKey] = useState('');
  const requestKey = JSON.stringify([
    orgSlug,
    page,
    search,
    statusFilter,
    typeFilter,
    refreshVersion,
  ]);
  const loading = loadedRequestKey !== requestKey;
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState('');
  const [deviceKey, setDeviceKey] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceRecord['deviceType']>('SIMULATOR');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [provisioned, setProvisioned] = useState<ProvisioningResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    setError(null);
    setRefreshVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (!orgSlug) return;
    let active = true;
    const query: Record<string, string> = { page: String(page), pageSize: '25' };
    if (search.trim()) query.search = search.trim();
    if (statusFilter) query.status = statusFilter;
    if (typeFilter) query.deviceType = typeFilter;

    listDevices(orgSlug, query)
      .then((data) => {
        if (!active) return;
        setDevices(data.items);
        setTotalCount(data.pagination.total);
        setTotalPages(Math.max(1, data.pagination.totalPages));
        setError(null);
        setLoadedRequestKey(requestKey);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load devices');
        setLoadedRequestKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [orgSlug, page, search, statusFilter, typeFilter, requestKey]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createDevice(orgSlug, {
        name,
        deviceKey,
        deviceType,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      toast.success(`Registered device "${name}" in PENDING status.`);
      setShowRegister(false);
      setName('');
      setDeviceKey('');
      setDescription('');
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to register device';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProvision(deviceId: string, rotate = false) {
    setBusyId(deviceId);
    setError(null);
    try {
      const res = rotate
        ? await rotateDeviceCredentials(orgSlug, deviceId)
        : await provisionDevice(orgSlug, deviceId);
      setProvisioned(res);
      setCopied(false);
      toast.success(rotate ? 'Credentials rotated — save the new secret now.' : 'One-time credentials issued.');
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Credential operation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAction(
    deviceId: string,
    action: 'activate' | 'suspend' | 'reactivate' | 'revoke' | 'retire',
  ) {
    setBusyId(deviceId);
    setError(null);
    try {
      await runDeviceAction(orgSlug, deviceId, action);
      toast.success(`Device ${action}d successfully.`);
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to ${action} device`;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
            Devices
          </h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Authenticated gateways and simulated publishers. Connectivity reflects broker activity only and never implies physical asset health.
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
              Register Device
            </Button>
          )}
        </div>
      </header>

      <section
        aria-label="Device filters"
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
              placeholder="Search name, key, or serial..."
              className="pl-9"
              aria-label="Search devices"
            />
          </div>
          <Select
            value={statusFilter || 'ALL'}
            onValueChange={(val) => {
              setStatusFilter(val === 'ALL' ? '' : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[155px]" aria-label="Filter by lifecycle status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="REVOKED">Revoked</SelectItem>
              <SelectItem value="RETIRED">Retired</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter || 'ALL'}
            onValueChange={(val) => {
              setTypeFilter(val === 'ALL' ? '' : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[165px]" aria-label="Filter by device type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="SIMULATOR">Simulated</SelectItem>
              <SelectItem value="GATEWAY">Gateway</SelectItem>
              <SelectItem value="EDGE_CONTROLLER">Edge Controller</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs tabular-nums text-[var(--text-muted)]">
          {loading ? 'Loading…' : `${totalCount} ${totalCount === 1 ? 'device' : 'devices'}`}
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
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]">
            <Cpu className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            {search || statusFilter || typeFilter ? 'No matching devices' : 'No devices registered'}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-[var(--text-secondary)]">
            {search || statusFilter || typeFilter
              ? 'Try clearing your search or status filters to see all registered devices.'
              : 'Register a simulated publisher or gateway endpoint, issue its one-time credential, and activate it to begin publishing.'}
          </p>
          {canCreate && !search && !statusFilter && !typeFilter && (
            <Button type="button" className="mt-6" onClick={() => setShowRegister(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Register your first device
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/60 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-3.5">Device</th>
                  <th className="px-4 py-3.5">Source</th>
                  <th className="px-4 py-3.5">Lifecycle</th>
                  <th className="px-4 py-3.5">Connectivity</th>
                  <th className="px-4 py-3.5">Last Seen</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {devices.map((device) => (
                  <tr
                    key={device.id}
                    className="transition-colors hover:bg-[var(--surface-2)]/60"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/app/organizations/${orgSlug}/devices/${device.id}`}
                        className="group inline-flex items-center gap-1.5 font-medium text-[var(--text-strong)] hover:text-[var(--accent-ink)]"
                      >
                        {device.name}
                        <ChevronRight
                          className="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-ink)]"
                          aria-hidden="true"
                        />
                      </Link>
                      <div className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
                        {device.deviceKey}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <DeviceProvenanceBadge type={device.deviceType} />
                    </td>
                    <td className="px-4 py-3.5">
                      <DeviceLifecycleBadge status={device.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <FreshnessBadge state={device.connectionState} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                      {device.lastSeenAt
                        ? new Date(device.lastSeenAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {device.status === 'PENDING' && canProvision && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === device.id}
                            onClick={() => void handleProvision(device.id, false)}
                          >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                            Provision
                          </Button>
                        )}
                        {device.status === 'PENDING' && canActivate && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === device.id}
                            onClick={() => void handleAction(device.id, 'activate')}
                          >
                            Activate
                          </Button>
                        )}
                        {device.status === 'ACTIVE' && canRotate && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === device.id}
                            onClick={() => void handleProvision(device.id, true)}
                          >
                            Rotate
                          </Button>
                        )}
                        {device.status === 'ACTIVE' && canSuspend && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === device.id}
                            onClick={() => void handleAction(device.id, 'suspend')}
                          >
                            Suspend
                          </Button>
                        )}
                        {device.status === 'SUSPENDED' && canActivate && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === device.id}
                            onClick={() => void handleAction(device.id, 'reactivate')}
                          >
                            Reactivate
                          </Button>
                        )}
                        {(device.status === 'ACTIVE' || device.status === 'SUSPENDED') && canRevoke && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={busyId === device.id}
                              onClick={() => setConfirmAction({ device, action: 'revoke' })}
                            >
                              Revoke
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busyId === device.id}
                              onClick={() => setConfirmAction({ device, action: 'retire' })}
                            >
                              Retire
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
          aria-labelledby="register-device-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleRegister}
            className="w-full max-w-md space-y-5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-2)] p-6 shadow-2xl"
          >
            <div className="space-y-1">
              <h2
                id="register-device-title"
                className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-strong)]"
              >
                Register Device
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Devices start in Pending status until credentials are provisioned and explicitly activated.
              </p>
            </div>
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">
                  Display Name
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Generator 001 Gateway"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">
                  Device Key
                </label>
                <Input
                  required
                  value={deviceKey}
                  onChange={(e) => setDeviceKey(e.target.value)}
                  placeholder="gateway-gen-001"
                  className="font-mono"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Lowercase slug; immutable after activation.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">
                  Device Type
                </label>
                <Select
                  value={deviceType}
                  onValueChange={(val) => setDeviceType(val as DeviceRecord['deviceType'])}
                >
                  <SelectTrigger className="w-full" aria-label="Device type">
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIMULATOR">Simulated Publisher (MVP)</SelectItem>
                    <SelectItem value="GATEWAY">Gateway</SelectItem>
                    <SelectItem value="EDGE_CONTROLLER">Edge Controller</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-primary)]">
                  Description <span className="text-[var(--text-muted)]">(optional)</span>
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Simulated generator telemetry publisher"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowRegister(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Registering…' : 'Register Device'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {provisioned && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="one-time-cred-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg space-y-5 rounded-[var(--radius-card)] border border-[var(--border-strong)] bg-[var(--surface-2)] p-6 shadow-2xl">
            <div className="space-y-1">
              <h2
                id="one-time-cred-title"
                className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-strong)]"
              >
                One-Time Device Credentials
              </h2>
              <p className="font-mono text-xs text-[var(--text-muted)]">
                {provisioned.deviceKey} · credential v{provisioned.credential.version}
              </p>
            </div>

            <div
              className="flex items-start gap-2.5 rounded-[var(--radius-md)] border p-3.5 text-xs"
              style={{
                color: 'var(--status-warning)',
                backgroundColor: 'var(--status-warning-bg)',
                borderColor: 'var(--status-warning-border)',
              }}
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Copy and store this secret now. GridAware stores only a cryptographic hash and cannot display this password again — if lost, rotate credentials.
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <div className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  MQTT Username
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-[var(--text-strong)]">
                  {provisioned.credential.username}
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  One-Time Password
                </div>
                <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-2">
                  <span className="break-all text-[var(--accent-ink)]">
                    {provisioned.credential.password}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(provisioned.credential.password);
                      setCopied(true);
                      toast.success('Copied secret to clipboard.');
                    }}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Authorized Publish Topics ({provisioned.mqtt.brokerUrl})
                </div>
                <ul className="space-y-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 text-[var(--text-secondary)]">
                  {provisioned.mqtt.publishTopics.map((topic) => (
                    <li key={topic} className="break-all">
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="button" onClick={() => setProvisioned(null)}>
                I have saved this secret
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-[var(--status-critical-border)] bg-[var(--surface-2)] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              Confirm permanent {confirmAction.action}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              This will permanently {confirmAction.action}{' '}
              <strong className="text-[var(--text-strong)]">{confirmAction.device.name}</strong>{' '}
              (<span className="font-mono text-xs">{confirmAction.device.deviceKey}</span>) and invalidate all credentials. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  const target = confirmAction;
                  setConfirmAction(null);
                  await handleAction(target.device.id, target.action);
                }}
              >
                Confirm {confirmAction.action}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
