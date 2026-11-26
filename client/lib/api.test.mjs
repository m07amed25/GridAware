import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { getApiBaseUrl } from "./api.ts";

describe("getApiBaseUrl", () => {
  const originalPublicUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalInternalUrl = process.env.API_INTERNAL_URL;

  afterEach(() => {
    if (originalPublicUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalPublicUrl;
    if (originalInternalUrl === undefined) delete process.env.API_INTERNAL_URL;
    else process.env.API_INTERNAL_URL = originalInternalUrl;
  });

  it("returns absolute internal URL on server when NEXT_PUBLIC_API_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_INTERNAL_URL;
    assert.equal(getApiBaseUrl(), "http://localhost:3001/api/v1");
  });

  it("resolves relative NEXT_PUBLIC_API_URL against API_INTERNAL_URL on server", () => {
    process.env.NEXT_PUBLIC_API_URL = "/api/v1";
    process.env.API_INTERNAL_URL = "http://api:3001/";
    assert.equal(getApiBaseUrl(), "http://api:3001/api/v1");
  });

  it("returns trimmed absolute NEXT_PUBLIC_API_URL when set", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api/v1/";
    assert.equal(getApiBaseUrl(), "http://localhost:3001/api/v1");
  });
});
