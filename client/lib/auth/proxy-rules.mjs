export const ACCESS_COOKIE_NAME = "ga_access";
export const REFRESH_COOKIE_NAME = "ga_refresh";

const PROTECTED_PREFIXES = ["/app", "/onboarding"];
const GUEST_ONLY_PATHS = new Set(["/login", "/register"]);

/**
 * Strictly allows internal relative paths starting with a single `/`
 * (rejects `//evil.com`, `https://...`, backslash tricks, or control chars).
 */
export function sanitizeNextPath(raw) {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!/^\/(?!\/)/.test(trimmed) || trimmed.includes("\\")) {
    return null;
  }
  return trimmed;
}

export function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function evaluateAuthProxy(input) {
  const {
    pathname,
    search,
    hasAccessCookie,
    hasRefreshCookie,
    reasonParam,
  } = input;

  if (pathname.startsWith("/api/")) {
    return { action: "next" };
  }

  if (isProtectedPath(pathname) && !hasAccessCookie && !hasRefreshCookie) {
    const safeNext = sanitizeNextPath(`${pathname}${search}`);
    const target = safeNext
      ? `/login?next=${encodeURIComponent(safeNext)}`
      : "/login";
    return { action: "redirect", location: target };
  }

  if (
    GUEST_ONLY_PATHS.has(pathname) &&
    hasAccessCookie &&
    reasonParam !== "session-expired"
  ) {
    return { action: "redirect", location: "/app" };
  }

  return { action: "next" };
}
