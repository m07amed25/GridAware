import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as shellNav from "./shell-nav.mjs";
import {
  buildShellNavGroups,
  extractActiveOrgId,
  getUserInitials,
  resolveActiveSidebarId,
} from "./shell-nav.mjs";

describe("Shell navigation helpers", () => {
  it("extracts and safely decodes organization IDs from protected paths", () => {
    assert.equal(extractActiveOrgId("/app"), null);
    assert.equal(extractActiveOrgId("/app/profile"), null);
    assert.equal(extractActiveOrgId("/app/organizations/org-123"), "org-123");
    assert.equal(
      extractActiveOrgId("/app/organizations/org-123/sites/site-9/buildings/b-2"),
      "org-123",
    );
    assert.equal(
      extractActiveOrgId("/app/organizations/org%20space/settings"),
      "org space",
    );
    assert.equal(extractActiveOrgId("/app/organizations/%E0%A4%A/sites"), "%E0%A4%A");
  });

  it("resolves active sidebar IDs for workspace, onboarding, profile, and nested org routes", () => {
    assert.equal(resolveActiveSidebarId("/app", null), "workspace-overview");
    assert.equal(resolveActiveSidebarId("/app/", null), "workspace-overview");
    assert.equal(resolveActiveSidebarId("/onboarding", null), "onboarding");
    assert.equal(
      resolveActiveSidebarId("/onboarding/organization", null),
      "onboarding",
    );
    assert.equal(resolveActiveSidebarId("/app/profile", null), "profile");
    assert.equal(
      resolveActiveSidebarId("/app/organizations/org-1", "org-1"),
      "org-overview",
    );
    assert.equal(
      resolveActiveSidebarId(
        "/app/organizations/org-1/sites/s-1/buildings/b-2",
        "org-1",
      ),
      "org-sites",
    );
    assert.equal(
      resolveActiveSidebarId("/app/organizations/org-1/members", "org-1"),
      "org-members",
    );
    assert.equal(
      resolveActiveSidebarId("/app/organizations/org-1/roles", "org-1"),
      "org-roles",
    );
    assert.equal(
      resolveActiveSidebarId("/app/organizations/org-1/settings", "org-1"),
      "org-settings",
    );
    assert.equal(resolveActiveSidebarId("/unknown/route", null), undefined);
  });

  it("omits Organization group when no org is active or permissions are loading, and filters by permissions when loaded", () => {
    const noOrg = buildShellNavGroups({
      activeOrgId: null,
      activeOrgName: null,
      permissions: null,
    });
    assert.equal(noOrg.length, 1);
    assert.equal(noOrg[0].label, "Workspace");
    assert.deepEqual(
      noOrg[0].items.map((item) => item.id),
      ["workspace-overview", "onboarding"],
    );

    const loadingOrg = buildShellNavGroups({
      activeOrgId: "org-1",
      activeOrgName: "North Plant",
      permissions: null,
    });
    assert.equal(loadingOrg.length, 1);

    const viewerOrg = buildShellNavGroups({
      activeOrgId: "org-1",
      activeOrgName: "North Plant",
      permissions: new Set(["organization:read", "sites:read"]),
    });
    assert.equal(viewerOrg.length, 2);
    assert.equal(viewerOrg[1].label, "North Plant");
    assert.deepEqual(
      viewerOrg[1].items.map((item) => item.id),
      ["org-overview", "org-sites", "org-settings"],
    );

    const ownerOrg = buildShellNavGroups({
      activeOrgId: "org-1",
      activeOrgName: null,
      permissions: new Set(["organization:read", "sites:read", "members:read"]),
    });
    assert.equal(ownerOrg[1].label, "Organization");
    assert.deepEqual(
      ownerOrg[1].items.map((item) => item.id),
      ["org-overview", "org-sites", "org-members", "org-roles", "org-settings"],
    );
  });

  it("publishes atomic pathname and organization snapshots", () => {
    assert.equal(typeof shellNav.createShellPathStore, "function");
    const store = shellNav.createShellPathStore();
    const initialSnapshot = store.getSnapshot();
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    assert.deepEqual(initialSnapshot, { pathname: "", activeOrgId: null });
    assert.equal(store.getServerSnapshot(), initialSnapshot);

    store.setPathname("/app/organizations/org-1/sites");
    assert.deepEqual(store.getSnapshot(), {
      pathname: "/app/organizations/org-1/sites",
      activeOrgId: "org-1",
    });
    assert.equal(notifications, 1);

    const sameSnapshot = store.getSnapshot();
    store.setPathname("/app/organizations/org-1/sites");
    assert.equal(store.getSnapshot(), sameSnapshot);
    assert.equal(notifications, 1);

    store.setPathname("/app/organizations/org-2/devices");
    assert.deepEqual(store.getSnapshot(), {
      pathname: "/app/organizations/org-2/devices",
      activeOrgId: "org-2",
    });
    assert.equal(notifications, 2);

    unsubscribe();
    store.setPathname("/app");
    assert.deepEqual(store.getSnapshot(), { pathname: "/app", activeOrgId: null });
    assert.equal(notifications, 2);
  });

  it("derives crisp 2-letter user initials safely", () => {
    assert.equal(getUserInitials("Sara Malik"), "SM");
    assert.equal(getUserInitials("Alex"), "AL");
    assert.equal(getUserInitials("   "), "GA");
  });
});
