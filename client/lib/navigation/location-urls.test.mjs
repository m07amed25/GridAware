import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendSearchAndHash,
  buildingDetailPath,
  isLocationDetailRoute,
  matchesEntityRef,
  orgOverviewPath,
  orgSitesPath,
  replaceOrgSegmentInPath,
  siteDetailPath,
  toUrlCode,
} from "./location-urls.mjs";

describe("Canonical location URL helpers", () => {
  it("normalizes site and building codes to trimmed lowercase URL segments", () => {
    assert.equal(toUrlCode("CAI-PLANT-01"), "cai-plant-01");
    assert.equal(toUrlCode("  PROD-HALL-01  "), "prod-hall-01");
    assert.equal(toUrlCode("tower-a"), "tower-a");
  });

  it("builds canonical organization, site, and building paths with lowercase codes", () => {
    assert.equal(
      orgOverviewPath("demo-gridaware-facilities"),
      "/app/organizations/demo-gridaware-facilities",
    );
    assert.equal(
      orgSitesPath("demo-gridaware-facilities"),
      "/app/organizations/demo-gridaware-facilities/sites",
    );
    assert.equal(
      siteDetailPath("demo-gridaware-facilities", "CAI-PLANT-01"),
      "/app/organizations/demo-gridaware-facilities/sites/cai-plant-01",
    );
    assert.equal(
      siteDetailPath("demo-gridaware-facilities", "CAI-PLANT-01", {
        includeArchived: true,
        hash: "site-buildings",
      }),
      "/app/organizations/demo-gridaware-facilities/sites/cai-plant-01?includeArchived=true#site-buildings",
    );
    assert.equal(
      buildingDetailPath(
        "demo-gridaware-facilities",
        "CAI-PLANT-01",
        "PROD-HALL-01",
      ),
      "/app/organizations/demo-gridaware-facilities/sites/cai-plant-01/buildings/prod-hall-01",
    );
    assert.equal(
      buildingDetailPath(
        "demo-gridaware-facilities",
        "CAI-PLANT-01",
        "PROD-HALL-01",
        { includeArchived: true },
      ),
      "/app/organizations/demo-gridaware-facilities/sites/cai-plant-01/buildings/prod-hall-01?includeArchived=true",
    );
  });

  it("canonicalizes legacy UUID and mixed-case org segments while returning null when already canonical", () => {
    assert.equal(
      replaceOrgSegmentInPath(
        "/app/organizations/0c24ade5-8891-4602-92cb-a0997418eb4e/sites/cai-plant-01",
        "demo-gridaware-facilities",
      ),
      "/app/organizations/demo-gridaware-facilities/sites/cai-plant-01",
    );
    assert.equal(
      replaceOrgSegmentInPath(
        "/app/organizations/Demo-GridAware-Facilities/settings",
        "demo-gridaware-facilities",
      ),
      "/app/organizations/demo-gridaware-facilities/settings",
    );
    assert.equal(
      replaceOrgSegmentInPath(
        "/app/organizations/demo-gridaware-facilities/sites",
        "demo-gridaware-facilities",
      ),
      null,
    );
    assert.equal(replaceOrgSegmentInPath("/app", "demo-gridaware-facilities"), null);
  });

  it("appends query string and hash cleanly when canonicalizing URLs", () => {
    assert.equal(
      appendSearchAndHash(
        "/app/organizations/demo-org/sites/cai-plant-01",
        "?includeArchived=true",
        "#site-buildings",
      ),
      "/app/organizations/demo-org/sites/cai-plant-01?includeArchived=true#site-buildings",
    );
    assert.equal(
      appendSearchAndHash("/app/organizations/demo-org/sites/cai-plant-01", "", ""),
      "/app/organizations/demo-org/sites/cai-plant-01",
    );
  });

  it("identifies site and building detail routes so OrgSubShell avoids racing partial redirects", () => {
    assert.equal(
      isLocationDetailRoute("/app/organizations/demo-org/sites/cai-plant-01"),
      true,
    );
    assert.equal(
      isLocationDetailRoute(
        "/app/organizations/0c24ade5-8891-4602-92cb-a0997418eb4e/sites/37b73715-9599-4470-b14f-4f93393f32b4/buildings/prod-hall-01",
      ),
      true,
    );
    assert.equal(isLocationDetailRoute("/app/organizations/demo-org/sites"), false);
    assert.equal(isLocationDetailRoute("/app/organizations/demo-org"), false);
    assert.equal(isLocationDetailRoute("/app/organizations/demo-org/settings"), false);
  });

  it("matches entity refs against canonical UUID or case-insensitive code without remounting", () => {
    const id = "37b73715-9599-4470-b14f-4f93393f32b4";
    assert.equal(matchesEntityRef(id, id, "CAI-PLANT-01"), true);
    assert.equal(matchesEntityRef("cai-plant-01", id, "CAI-PLANT-01"), true);
    assert.equal(matchesEntityRef("CAI-PLANT-01", id, "CAI-PLANT-01"), true);
    assert.equal(matchesEntityRef("other-site", id, "CAI-PLANT-01"), false);
  });
});
