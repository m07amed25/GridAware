import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGrossAreaDisplay,
  formatLocationCodePreview,
  formatSiteLocalTime,
  parseArchiveBlockedBuildingCount,
  validateBuildingFormInput,
  validateSiteFormInput,
} from "./validation.mjs";

describe("Client location pure helpers", () => {
  it("normalizes code previews by trimming and uppercasing without rewriting spaces", () => {
    assert.equal(formatLocationCodePreview("  cai-plant-01 "), "CAI-PLANT-01");
    assert.equal(formatLocationCodePreview("prod hall 1"), "PROD HALL 1");
  });

  it("formats grossAreaSqM strings with m² unit and tabular grouping", () => {
    assert.equal(formatGrossAreaDisplay("4200.00"), "4,200.00 m²");
    assert.equal(formatGrossAreaDisplay("125.5"), "125.50 m²");
    assert.equal(formatGrossAreaDisplay(null), "Not specified");
    assert.equal(formatGrossAreaDisplay(""), "Not specified");
  });

  it("formats site local time using IANA timeZone safely", () => {
    const sampleDate = new Date("2026-11-27T12:00:00.000Z");
    const cairoTime = formatSiteLocalTime("Africa/Cairo", sampleDate);
    assert.match(cairoTime, /14:00|2:00/);

    const fallbackTime = formatSiteLocalTime("Invalid/Zone", sampleDate);
    assert.equal(typeof fallbackTime, "string");
    assert.ok(fallbackTime.length > 0);
  });

  it("parses active building count from SITE_HAS_ACTIVE_BUILDINGS detail messages", () => {
    assert.equal(
      parseArchiveBlockedBuildingCount(
        "Cannot archive site while 3 non-archived buildings remain. Archive all buildings first.",
      ),
      3,
    );
    assert.equal(
      parseArchiveBlockedBuildingCount(
        "Cannot archive site while 1 non-archived building remains.",
      ),
      1,
    );
    assert.equal(parseArchiveBlockedBuildingCount("Unrelated message"), null);
  });

  it("validates site form inputs including paired coordinates, code syntax, and IANA time zone", () => {
    const valid = validateSiteFormInput({
      mode: "create",
      code: "cai-plant-01",
      name: "Cairo Manufacturing Plant",
      type: "FACTORY",
      timeZone: "Africa/Cairo",
      latitude: "30.0444",
      longitude: "31.2357",
      countryCode: "eg",
    });
    assert.deepEqual(valid, {});

    const partialCoords = validateSiteFormInput({
      mode: "create",
      code: "CAI-01",
      name: "Cairo Plant",
      type: "FACTORY",
      timeZone: "Africa/Cairo",
      latitude: "30.0444",
      longitude: "",
      countryCode: "EG",
    });
    assert.ok(partialCoords.longitude);

    const invalidCodeAndTz = validateSiteFormInput({
      mode: "create",
      code: "BAD CODE",
      name: "A",
      type: "FACTORY",
      timeZone: "+02:00",
      latitude: "",
      longitude: "",
      countryCode: "EGY",
    });
    assert.ok(invalidCodeAndTz.code);
    assert.ok(invalidCodeAndTz.name);
    assert.ok(invalidCodeAndTz.timeZone);
    assert.ok(invalidCodeAndTz.countryCode);
  });

  it("validates building form inputs including floorCount bounds and grossAreaSqM decimal strings", () => {
    const valid = validateBuildingFormInput({
      mode: "create",
      code: "PROD-HALL-01",
      name: "Production Hall 1",
      type: "PRODUCTION",
      floorCount: "2",
      grossAreaSqM: "4200.50",
    });
    assert.deepEqual(valid, {});

    const invalid = validateBuildingFormInput({
      mode: "create",
      code: "-BAD-",
      name: "X",
      type: "PRODUCTION",
      floorCount: "0",
      grossAreaSqM: "12.345",
    });
    assert.ok(invalid.code);
    assert.ok(invalid.name);
    assert.ok(invalid.floorCount);
    assert.ok(invalid.grossAreaSqM);
  });
});
