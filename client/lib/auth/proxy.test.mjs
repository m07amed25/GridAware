import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAuthProxy, sanitizeNextPath } from "./proxy-rules.mjs";

test("sanitizeNextPath allows safe relative paths and blocks open redirects", () => {
  assert.equal(sanitizeNextPath("/app/profile"), "/app/profile");
  assert.equal(sanitizeNextPath("/app?tab=sessions"), "/app?tab=sessions");
  assert.equal(sanitizeNextPath("//evil.example.com"), null);
  assert.equal(sanitizeNextPath("https://evil.example.com/app"), null);
  assert.equal(sanitizeNextPath("/\\evil.example.com"), null);
  assert.equal(sanitizeNextPath(""), null);
  assert.equal(sanitizeNextPath(null), null);
});

test("evaluateAuthProxy redirects unauthenticated visitors from protected routes to /login?next=...", () => {
  const res = evaluateAuthProxy({
    pathname: "/app/profile",
    search: "?focus=sessions",
    hasAccessCookie: false,
    hasRefreshCookie: false,
    reasonParam: null,
  });

  assert.deepEqual(res, {
    action: "redirect",
    location: "/login?next=%2Fapp%2Fprofile%3Ffocus%3Dsessions",
  });
});

test("evaluateAuthProxy allows protected route when refresh cookie is present for client/DAL renewal", () => {
  const res = evaluateAuthProxy({
    pathname: "/app",
    search: "",
    hasAccessCookie: false,
    hasRefreshCookie: true,
    reasonParam: null,
  });

  assert.deepEqual(res, { action: "next" });
});

test("evaluateAuthProxy redirects signed-in users away from /login and /register unless session-expired", () => {
  assert.deepEqual(
    evaluateAuthProxy({
      pathname: "/login",
      search: "",
      hasAccessCookie: true,
      hasRefreshCookie: true,
      reasonParam: null,
    }),
    { action: "redirect", location: "/app" },
  );

  assert.deepEqual(
    evaluateAuthProxy({
      pathname: "/login",
      search: "?reason=session-expired",
      hasAccessCookie: true,
      hasRefreshCookie: false,
      reasonParam: "session-expired",
    }),
    { action: "next" },
  );
});
