import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  evaluateAuthProxy,
} from "./lib/auth/proxy-rules.mjs";

export {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  evaluateAuthProxy,
  isProtectedPath,
  sanitizeNextPath,
} from "./lib/auth/proxy-rules.mjs";

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const decision = evaluateAuthProxy({
    pathname,
    search,
    hasAccessCookie: request.cookies.has(ACCESS_COOKIE_NAME),
    hasRefreshCookie: request.cookies.has(REFRESH_COOKIE_NAME),
    reasonParam: searchParams.get("reason"),
  });

  if (decision.action === "redirect" && decision.location) {
    return NextResponse.redirect(new URL(decision.location, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/onboarding/:path*", "/login", "/register"],
};
