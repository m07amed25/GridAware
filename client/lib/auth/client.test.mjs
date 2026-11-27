import assert from "node:assert/strict";
import test from "node:test";
import { createRefreshCoordinator } from "./refresh-coordinator.mjs";

test("refresh coordinator serializes concurrent 401 refreshes into a single /auth/refresh call", async () => {
  let refreshCalls = 0;
  let broadcastEvents = [];

  const coordinator = createRefreshCoordinator({
    executeRefresh: async () => {
      refreshCalls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return true;
    },
    broadcast: (event) => broadcastEvents.push(event),
  });

  const results = await Promise.all([
    coordinator.refreshOnce(),
    coordinator.refreshOnce(),
    coordinator.refreshOnce(),
  ]);

  assert.deepEqual(results, [true, true, true]);
  assert.equal(refreshCalls, 1);
  assert.deepEqual(broadcastEvents, [{ type: "SESSION_REFRESHED" }]);
});

test("refresh coordinator broadcasts SESSION_INVALIDATED when refresh fails", async () => {
  const events = [];
  const coordinator = createRefreshCoordinator({
    executeRefresh: async () => false,
    broadcast: (event) => events.push(event),
  });

  const ok = await coordinator.refreshOnce();
  assert.equal(ok, false);
  assert.deepEqual(events, [{ type: "SESSION_INVALIDATED" }]);
});
