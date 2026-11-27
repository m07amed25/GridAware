import assert from "node:assert/strict";
import test from "node:test";
import { parseSessionClient } from "./user-agent-parser.mjs";

test("parseSessionClient identifies desktop Chrome, Edge, Firefox, and Safari accurately", () => {
  const edge = parseSessionClient(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  );
  assert.equal(edge.browser, "Edge");
  assert.equal(edge.os, "Windows");
  assert.equal(edge.deviceType, "desktop");
  assert.equal(edge.summary, "Edge on Windows");

  const chromeMac = parseSessionClient(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  );
  assert.equal(chromeMac.summary, "Chrome on macOS");
  assert.equal(chromeMac.deviceType, "desktop");

  const firefoxLinux = parseSessionClient(
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
  );
  assert.equal(firefoxLinux.summary, "Firefox on Linux");
  assert.equal(firefoxLinux.deviceType, "desktop");

  const safariMac = parseSessionClient(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  );
  assert.equal(safariMac.summary, "Safari on macOS");
});

test("parseSessionClient identifies mobile and tablet devices", () => {
  const iphone = parseSessionClient(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  );
  assert.equal(iphone.deviceType, "mobile");
  assert.equal(iphone.os, "iOS");
  assert.equal(iphone.browser, "Mobile Safari");
  assert.equal(iphone.summary, "Mobile Safari on iOS");

  const ipad = parseSessionClient(
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1",
  );
  assert.equal(ipad.deviceType, "tablet");
  assert.equal(ipad.summary, "Chrome on iOS");

  const androidTablet = parseSessionClient(
    "Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  );
  assert.equal(androidTablet.deviceType, "tablet");
  assert.equal(androidTablet.summary, "Chrome on Android");
});

test("parseSessionClient handles CLI clients and null/malformed user agents safely", () => {
  const curl = parseSessionClient("curl/8.7.1");
  assert.equal(curl.deviceType, "unknown");
  assert.equal(curl.summary, "curl (CLI / API client)");

  const empty = parseSessionClient(null);
  assert.equal(empty.summary, "Unknown browser or client");
  assert.equal(empty.raw, null);
  assert.equal(empty.deviceType, "unknown");

  const custom = parseSessionClient("CustomInternalAgent/1.0");
  assert.equal(custom.summary, "Unknown browser or client");
  assert.equal(custom.raw, "CustomInternalAgent/1.0");
});
