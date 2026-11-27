import { sanitizeNextPath } from "./proxy-rules.mjs";

const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDisplayName(raw) {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length === 0) {
    return "Enter your full name.";
  }
  if (trimmed.length < 2) {
    return "Display name must be at least 2 characters.";
  }
  if (trimmed.length > 100) {
    return "Display name must be 100 characters or fewer.";
  }
  return undefined;
}

export function validateEmailAddress(raw) {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length === 0) {
    return "Enter your email address.";
  }
  if (!BASIC_EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address (for example, alex@facility.example).";
  }
  return undefined;
}

export function validateLoginPassphrase(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    return "Enter your passphrase.";
  }
  return undefined;
}

export function validateNewPassphrase(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    return "Enter a passphrase of 12 to 128 characters.";
  }
  const length = Array.from(raw).length;
  if (length < 12) {
    return `Passphrase must be at least 12 characters (${12 - length} more needed).`;
  }
  if (length > 128) {
    return "Passphrase must be 128 characters or fewer.";
  }
  return undefined;
}

export function validateConfirmPassphrase(passphrase, confirmation) {
  if (typeof confirmation !== "string" || confirmation.length === 0) {
    return "Confirm your passphrase to check for typos.";
  }
  if (passphrase !== confirmation) {
    return "Passphrases do not match.";
  }
  return undefined;
}

/**
 * Builds an ordered list of FormErrorItem entries matching field presentation order.
 * @param {Array<{ fieldId: string; fieldName: string; message?: string }>} entries
 */
export function buildFormErrorSummary(entries) {
  return entries
    .filter((entry) => Boolean(entry.message))
    .map((entry) => ({
      fieldId: entry.fieldId,
      fieldName: entry.fieldName,
      message: entry.message,
    }));
}

export function buildLoginHref(options = {}) {
  const params = new URLSearchParams();
  if (options.verified) {
    params.set("verified", "1");
  }
  if (options.reset) {
    params.set("reset", "1");
  }
  if (options.reason === "session-expired" || options.reason === "signed-out") {
    params.set("reason", options.reason);
  }
  const email = typeof options.email === "string" ? options.email.trim() : "";
  if (email) {
    params.set("email", email);
  }
  const safeNext = sanitizeNextPath(options.next);
  if (safeNext) {
    params.set("next", safeNext);
  }
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function buildVerifyEmailHref(options = {}) {
  const params = new URLSearchParams();
  const email = typeof options.email === "string" ? options.email.trim() : "";
  if (email) {
    params.set("email", email);
  }
  if (options.sent) {
    params.set("sent", "1");
  }
  const query = params.toString();
  return query ? `/verify-email?${query}` : "/verify-email";
}

export function buildForgotPasswordHref(options = {}) {
  const params = new URLSearchParams();
  const email = typeof options.email === "string" ? options.email.trim() : "";
  if (email) {
    params.set("email", email);
  }
  const query = params.toString();
  return query ? `/forgot-password?${query}` : "/forgot-password";
}
