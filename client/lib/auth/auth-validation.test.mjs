import assert from "node:assert/strict";
import test from "node:test";
import {
  buildForgotPasswordHref,
  buildFormErrorSummary,
  buildLoginHref,
  buildVerifyEmailHref,
  validateConfirmPassphrase,
  validateDisplayName,
  validateEmailAddress,
  validateLoginPassphrase,
  validateNewPassphrase,
} from "./auth-validation.mjs";

test("validateDisplayName checks empty, min, max, and trimmed valid values", () => {
  assert.ok(validateDisplayName("   "));
  assert.ok(validateDisplayName("A"));
  assert.ok(validateDisplayName("A".repeat(101)));
  assert.equal(validateDisplayName("  Alex Morgan  "), undefined);
});

test("validateEmailAddress accepts standard emails and rejects malformed input", () => {
  assert.ok(validateEmailAddress(""));
  assert.ok(validateEmailAddress("alex@localhost"));
  assert.ok(validateEmailAddress("not-an-email"));
  assert.equal(validateEmailAddress("  Alex.Morgan@Facility.Example  "), undefined);
});

test("validateLoginPassphrase only requires non-empty input", () => {
  assert.ok(validateLoginPassphrase(""));
  assert.equal(validateLoginPassphrase("any-passphrase"), undefined);
});

test("validateNewPassphrase counts Unicode codepoints across 12..128 bounds", () => {
  assert.ok(validateNewPassphrase(""));
  assert.ok(validateNewPassphrase("12345678901"));
  assert.equal(validateNewPassphrase("123456789012"), undefined);
  assert.equal(validateNewPassphrase("🔒".repeat(12)), undefined);
  assert.ok(validateNewPassphrase("🔒".repeat(11)));
  assert.equal(validateNewPassphrase("a".repeat(128)), undefined);
  assert.ok(validateNewPassphrase("a".repeat(129)));
});

test("validateConfirmPassphrase detects missing confirmation and mismatches", () => {
  assert.ok(validateConfirmPassphrase("correct horse battery", ""));
  assert.ok(validateConfirmPassphrase("correct horse battery", "correct horse"));
  assert.equal(
    validateConfirmPassphrase("correct horse battery", "correct horse battery"),
    undefined,
  );
});

test("buildFormErrorSummary preserves field order and omits valid fields", () => {
  const summary = buildFormErrorSummary([
    { fieldId: "reg-name", fieldName: "Full name", message: "Enter your full name." },
    { fieldId: "reg-email", fieldName: "Work email", message: undefined },
    { fieldId: "reg-pass", fieldName: "Passphrase", message: "Too short" },
  ]);
  assert.deepEqual(summary, [
    { fieldId: "reg-name", fieldName: "Full name", message: "Enter your full name." },
    { fieldId: "reg-pass", fieldName: "Passphrase", message: "Too short" },
  ]);
});

test("safe prefill href builders sanitize next paths and trim emails", () => {
  assert.equal(
    buildLoginHref({
      verified: true,
      email: "  alex@grid.example ",
      next: "/app/profile",
    }),
    "/login?verified=1&email=alex%40grid.example&next=%2Fapp%2Fprofile",
  );
  assert.equal(
    buildLoginHref({ next: "https://evil.example/phish", reason: "signed-out" }),
    "/login?reason=signed-out",
  );
  assert.equal(
    buildVerifyEmailHref({ email: "alex@grid.example", sent: true }),
    "/verify-email?email=alex%40grid.example&sent=1",
  );
  assert.equal(
    buildForgotPasswordHref({ email: "alex@grid.example" }),
    "/forgot-password?email=alex%40grid.example",
  );
});
