import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EnvValidationError,
  getServerEnv,
  validateClientEnv,
  validateServerEnv,
} from "./env.ts";

describe("validateClientEnv", () => {
  it("allows NEXT_PUBLIC_API_URL to be omitted or blank", () => {
    assert.deepEqual(validateClientEnv({}), { NEXT_PUBLIC_API_URL: undefined });
    assert.deepEqual(validateClientEnv({ NEXT_PUBLIC_API_URL: "   " }), {
      NEXT_PUBLIC_API_URL: undefined,
    });
  });

  it("normalizes relative and absolute NEXT_PUBLIC_API_URL values", () => {
    assert.deepEqual(validateClientEnv({ NEXT_PUBLIC_API_URL: " /api/v1/ " }), {
      NEXT_PUBLIC_API_URL: "/api/v1",
    });
    assert.deepEqual(
      validateClientEnv({
        NEXT_PUBLIC_API_URL: "https://api.gridaware.io/api/v1/",
      }),
      {
        NEXT_PUBLIC_API_URL: "https://api.gridaware.io/api/v1",
      },
    );
  });

  it("rejects malformed, protocol-relative, or non-http NEXT_PUBLIC_API_URL", () => {
    for (const invalid of [
      "//evil.example.com/api",
      "ftp://localhost:3001/api",
      "localhost:3001/api",
      "/api/v1?debug=1",
      "http://localhost:3001/api#frag",
    ]) {
      assert.throws(
        () => validateClientEnv({ NEXT_PUBLIC_API_URL: invalid }),
        (error) =>
          error instanceof EnvValidationError &&
          error.issues.some((i) => i.path === "NEXT_PUBLIC_API_URL"),
      );
    }
  });
});

describe("validateServerEnv", () => {
  it("applies defaults when values are omitted or blank", () => {
    assert.deepEqual(validateServerEnv({}), {
      NODE_ENV: "development",
      NEXT_PUBLIC_API_URL: undefined,
      API_INTERNAL_URL: "http://localhost:3001",
    });

    assert.deepEqual(
      validateServerEnv({
        NODE_ENV: "",
        NEXT_PUBLIC_API_URL: "  ",
        API_INTERNAL_URL: " ",
      }),
      {
        NODE_ENV: "development",
        NEXT_PUBLIC_API_URL: undefined,
        API_INTERNAL_URL: "http://localhost:3001",
      },
    );
  });

  it("validates and normalizes API_INTERNAL_URL and NODE_ENV", () => {
    assert.deepEqual(
      validateServerEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_API_URL: "/api/v1",
        API_INTERNAL_URL: "http://server:3001/",
      }),
      {
        NODE_ENV: "production",
        NEXT_PUBLIC_API_URL: "/api/v1",
        API_INTERNAL_URL: "http://server:3001",
      },
    );
  });

  it("aggregates all invalid server-side env errors together", () => {
    assert.throws(
      () =>
        validateServerEnv({
          NODE_ENV: "staging",
          NEXT_PUBLIC_API_URL: "//bad",
          API_INTERNAL_URL: "mqtt://server:1883",
        }),
      (error) => {
        assert.ok(error instanceof EnvValidationError);
        const paths = error.issues.map((i) => i.path);
        assert.deepEqual(paths, [
          "NODE_ENV",
          "NEXT_PUBLIC_API_URL",
          "API_INTERNAL_URL",
        ]);
        return true;
      },
    );
  });
});

describe("getServerEnv", () => {
  it("refuses to run when window is defined", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
    });
    try {
      assert.throws(
        () => getServerEnv(),
        /getServerEnv\(\) cannot be called in the browser/,
      );
    } finally {
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
        });
      }
    }
  });
});
