'use client';

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Cpu,
  FlaskConical,
  HelpCircle,
  PauseCircle,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import type { DerivedFreshnessState, DeviceRecord } from '@/lib/api/devices';
import type { SensorRecord } from '@/lib/api/sensors';

const BADGE_BASE =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight whitespace-nowrap';

export function FreshnessBadge({ state }: { state: DerivedFreshnessState }) {
  switch (state) {
    case 'ONLINE':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-success)',
            backgroundColor: 'var(--status-success-bg)',
            borderColor: 'var(--status-success-border)',
          }}
        >
          <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Online
        </span>
      );
    case 'STALE':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-warning)',
            backgroundColor: 'var(--status-warning-bg)',
            borderColor: 'var(--status-warning-border)',
          }}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Stale
        </span>
      );
    case 'OFFLINE':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-offline)',
            backgroundColor: 'rgba(154, 161, 172, 0.12)',
            borderColor: 'rgba(154, 161, 172, 0.36)',
          }}
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Offline
        </span>
      );
    case 'MAINTENANCE':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-info)',
            backgroundColor: 'var(--status-info-bg)',
            borderColor: 'var(--status-info-border)',
          }}
        >
          <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Maintenance
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-unknown)',
            backgroundColor: 'rgba(179, 164, 216, 0.12)',
            borderColor: 'rgba(179, 164, 216, 0.36)',
          }}
        >
          <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Never connected
        </span>
      );
  }
}

export function DeviceLifecycleBadge({ status }: { status: DeviceRecord['status'] }) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-success)',
            backgroundColor: 'var(--status-success-bg)',
            borderColor: 'var(--status-success-border)',
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Active
        </span>
      );
    case 'PENDING':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-info)',
            backgroundColor: 'var(--status-info-bg)',
            borderColor: 'var(--status-info-border)',
          }}
        >
          <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Pending
        </span>
      );
    case 'SUSPENDED':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-warning)',
            backgroundColor: 'var(--status-warning-bg)',
            borderColor: 'var(--status-warning-border)',
          }}
        >
          <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Suspended
        </span>
      );
    case 'REVOKED':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-critical)',
            backgroundColor: 'var(--status-critical-bg)',
            borderColor: 'var(--status-critical-border)',
          }}
        >
          <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Revoked
        </span>
      );
    case 'RETIRED':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-offline)',
            backgroundColor: 'rgba(154, 161, 172, 0.12)',
            borderColor: 'rgba(154, 161, 172, 0.36)',
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Retired
        </span>
      );
  }
}

export function SensorLifecycleBadge({ status }: { status: SensorRecord['status'] }) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-success)',
            backgroundColor: 'var(--status-success-bg)',
            borderColor: 'var(--status-success-border)',
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Active
        </span>
      );
    case 'PLANNED':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-info)',
            backgroundColor: 'var(--status-info-bg)',
            borderColor: 'var(--status-info-border)',
          }}
        >
          <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Planned
        </span>
      );
    case 'MAINTENANCE':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-warning)',
            backgroundColor: 'var(--status-warning-bg)',
            borderColor: 'var(--status-warning-border)',
          }}
        >
          <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Maintenance
        </span>
      );
    case 'DISABLED':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-offline)',
            backgroundColor: 'rgba(154, 161, 172, 0.12)',
            borderColor: 'rgba(154, 161, 172, 0.36)',
          }}
        >
          <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Disabled
        </span>
      );
    case 'RETIRED':
      return (
        <span
          className={BADGE_BASE}
          style={{
            color: 'var(--status-critical)',
            backgroundColor: 'var(--status-critical-bg)',
            borderColor: 'var(--status-critical-border)',
          }}
        >
          <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Retired
        </span>
      );
  }
}

export function DeviceProvenanceBadge({ type }: { type: DeviceRecord['deviceType'] }) {
  const isSimulated = type === 'SIMULATOR';
  return (
    <span
      className={BADGE_BASE}
      style={
        isSimulated
          ? {
              color: 'var(--status-info)',
              backgroundColor: 'var(--status-info-bg)',
              borderColor: 'var(--status-info-border)',
            }
          : {
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border-default)',
            }
      }
    >
      {isSimulated ? (
        <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {isSimulated ? 'Simulated' : type.replace('_', ' ')}
    </span>
  );
}
