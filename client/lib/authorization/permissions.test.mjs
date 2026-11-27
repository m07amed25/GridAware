import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSIGNABLE_NON_OWNER_ROLES,
  can,
  canAll,
  canAny,
  getVisibleOrgNavItems,
  isReadOnlyRole,
} from "./permissions.mjs";

describe("Frontend authorization capability helpers", () => {
  it("evaluates single, AND, and ANY permission checks safely", () => {
    const perms = new Set([
      "organization:read",
      "assets:read",
      "assets:create",
    ]);

    assert.equal(can(perms, "assets:create"), true);
    assert.equal(can(perms, "members:read"), false);
    assert.equal(canAll(perms, ["assets:read", "assets:create"]), true);
    assert.equal(canAll(perms, ["assets:read", "assets:archive"]), false);
    assert.equal(canAll(perms, []), false);
    assert.equal(canAny(perms, ["members:read", "assets:create"]), true);
    assert.equal(canAny(perms, ["members:read", "audit-logs:read"]), false);
  });

  it("identifies VIEWER as strictly read-only and excludes OWNER from assignable roles", () => {
    assert.equal(isReadOnlyRole("VIEWER"), true);
    assert.equal(isReadOnlyRole("OWNER"), false);
    assert.equal(isReadOnlyRole("TECHNICIAN"), false);
    assert.equal(ASSIGNABLE_NON_OWNER_ROLES.includes("OWNER"), false);
    assert.deepEqual([...ASSIGNABLE_NON_OWNER_ROLES], [
      "FACILITY_MANAGER",
      "ENGINEER",
      "TECHNICIAN",
      "VIEWER",
    ]);
  });

  it("filters organization navigation items by role capabilities", () => {
    const ownerPerms = new Set(["organization:read", "members:read"]);
    const viewerPerms = new Set(["organization:read", "assets:read"]);

    const ownerNav = getVisibleOrgNavItems("org-1", ownerPerms);
    const viewerNav = getVisibleOrgNavItems("org-1", viewerPerms);

    assert.deepEqual(
      ownerNav.map((item) => item.id),
      ["overview", "members", "roles", "settings"],
    );
    assert.deepEqual(
      viewerNav.map((item) => item.id),
      ["overview", "settings"],
    );
  });
});
