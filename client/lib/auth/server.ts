import { cookies } from "next/headers";
import { getServerEnv } from "../env";
import type { ApiEnvelope, SafeUserProfile } from "./types";

/**
 * Server Component Data Access Layer (DAL).
 * Must only be invoked inside a `<Suspense>` boundary so Next.js 16 `cacheComponents: true`
 * static shells prerender cleanly.
 */
export async function getServerCurrentUser(): Promise<SafeUserProfile | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  if (!cookieHeader) {
    return null;
  }

  const { API_INTERNAL_URL } = getServerEnv();
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as ApiEnvelope<{
      user: SafeUserProfile;
    }>;
    return body.data.user;
  } catch {
    return null;
  }
}
