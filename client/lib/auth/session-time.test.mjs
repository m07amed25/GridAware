import assert from "node:assert/strict";
import test from "node:test";
import {
  formatExactTimestamp,
  formatRelativeRecency,
  formatSessionTimes,
} from "./session-time.mjs";

test("formatRelativeRecency produces deterministic buckets for seconds, minutes, hours, and days", () => {
  const now = Date.parse("2026-11-27T12:00:00.000Z");
  assert.equal(formatRelativeRecency("2026-11-27T11:59:35.000Z", now), "Just now");
  assert.equal(formatRelativeRecency("2026-11-27T11:55:00.000Z", now), "5m ago");
  assert.equal(formatRelativeRecency("2026-11-27T09:00:00.000Z", now), "3h ago");
  assert.equal(formatRelativeRecency("2026-11-23T12:00:00.000Z", now), "4d ago");
  assert.equal(formatRelativeRecency("invalid-date", now), "invalid-date");
});

test("formatExactTimestamp includes explicit timezone and handles invalid dates", () => {
  const formatted = formatExactTimestamp("2026-11-27T12:30:00.000Z", {
    locale: "en-US",
    timeZone: "UTC",
  });
  assert.match(formatted, /Nov 27, 2026/);
  assert.match(formatted, /UTC/);
  assert.equal(formatExactTimestamp("not-a-date"), "not-a-date");
});

test("formatSessionTimes returns complete SessionTimeDisplay shape", () => {
  const now = Date.parse("2026-11-27T12:00:00.000Z");
  const display = formatSessionTimes(
    {
      lastUsedAt: "2026-11-27T11:48:00.000Z",
      idleExpiresAt: "2026-12-11T11:48:00.000Z",
      absoluteExpiresAt: "2026-12-27T11:48:00.000Z",
    },
    { nowMs: now, locale: "en-US", timeZone: "UTC" },
  );
  assert.equal(display.lastActiveRelative, "12m ago");
  assert.match(display.lastActiveExact, /Nov 27, 2026/);
  assert.match(display.idleExpiresExact, /Dec 11, 2026/);
  assert.match(display.absoluteExpiresExact, /Dec 27, 2026/);
});
