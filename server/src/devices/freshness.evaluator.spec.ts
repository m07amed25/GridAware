import { describe, expect, it } from 'vitest';
import { evaluateFreshness } from './freshness.evaluator.js';

describe('evaluateFreshness', () => {
  const now = new Date('2026-11-27T12:00:00.000Z');

  it('returns MAINTENANCE when isMaintenance is true', () => {
    expect(
      evaluateFreshness({
        lastObservedAt: now,
        isMaintenance: true,
        now,
      }),
    ).toBe('MAINTENANCE');
  });

  it('returns UNKNOWN when never observed', () => {
    expect(evaluateFreshness({ lastObservedAt: null, now })).toBe('UNKNOWN');
  });

  it('returns OFFLINE when lastDisconnectedAt >= lastObservedAt', () => {
    expect(
      evaluateFreshness({
        lastObservedAt: new Date('2026-11-27T11:59:30.000Z'),
        lastDisconnectedAt: new Date('2026-11-27T11:59:45.000Z'),
        now,
      }),
    ).toBe('OFFLINE');
  });

  it('returns ONLINE within 2x expectedReportingIntervalSeconds', () => {
    expect(
      evaluateFreshness({
        lastObservedAt: new Date('2026-11-27T11:59:10.000Z'),
        expectedReportingIntervalSeconds: 30,
        now,
      }),
    ).toBe('ONLINE');
  });

  it('returns STALE between 2x and 4x expectedReportingIntervalSeconds', () => {
    expect(
      evaluateFreshness({
        lastObservedAt: new Date('2026-11-27T11:58:30.000Z'),
        expectedReportingIntervalSeconds: 30,
        now,
      }),
    ).toBe('STALE');
  });

  it('returns OFFLINE beyond 4x expectedReportingIntervalSeconds', () => {
    expect(
      evaluateFreshness({
        lastObservedAt: new Date('2026-11-27T11:55:00.000Z'),
        expectedReportingIntervalSeconds: 30,
        now,
      }),
    ).toBe('OFFLINE');
  });
});
