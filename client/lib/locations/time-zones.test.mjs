import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMMON_TIME_ZONES,
  getTimeZoneCatalog,
  getTimeZoneOffsetLabel,
  getTimeZoneSearchKeywords,
} from "./time-zones.mjs";

describe("Client location IANA time zone helpers", () => {
  it("formats UTC offset labels for standard and fractional zones", () => {
    const winterDate = new Date("2026-01-15T12:00:00.000Z");
    assert.equal(getTimeZoneOffsetLabel("UTC", winterDate), "UTC+00:00");
    assert.equal(
      getTimeZoneOffsetLabel("Africa/Cairo", winterDate),
      "UTC+02:00",
    );
    assert.equal(
      getTimeZoneOffsetLabel("Asia/Kolkata", winterDate),
      "UTC+05:30",
    );
    assert.equal(
      getTimeZoneOffsetLabel("Asia/Tehran", winterDate),
      "UTC+03:30",
    );
    assert.equal(
      getTimeZoneOffsetLabel("America/New_York", winterDate),
      "UTC-05:00",
    );
  });

  it("builds human-friendly search keywords for city, region, and offset", () => {
    const keywords = getTimeZoneSearchKeywords("America/New_York", "UTC-05:00");
    assert.ok(keywords.includes("America/New_York"));
    assert.ok(keywords.includes("America New York"));
    assert.ok(keywords.includes("New York"));
    assert.ok(keywords.includes("UTC-05:00"));
    assert.ok(keywords.includes("-05:00"));
    assert.ok(keywords.includes("UTC-5"));
  });

  it("builds a deduplicated catalog with local zone promoted to recommended", () => {
    const sampleDate = new Date("2026-11-27T12:00:00.000Z");
    const catalog = getTimeZoneCatalog({
      date: sampleDate,
      detectedTimeZone: "Asia/Tokyo",
      selectedTimeZone: "Europe/Paris",
    });

    assert.equal(catalog.recommended[0].value, "Asia/Tokyo");
    assert.equal(catalog.recommended[0].isLocal, true);

    for (const tz of COMMON_TIME_ZONES) {
      assert.ok(
        catalog.recommended.some((option) => option.value === tz),
        `expected ${tz} in recommended`,
      );
    }

    const combined = [...catalog.recommended, ...catalog.all];
    const uniqueValues = new Set(combined.map((option) => option.value));
    assert.equal(uniqueValues.size, combined.length);
    assert.ok(catalog.all.some((option) => option.value === "Europe/Paris"));
  });
});
