import { getClientEnv, getServerEnv } from "./env.ts";

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export function getApiBaseUrl(): string {
  const { NEXT_PUBLIC_API_URL: normalizedPublic } = getClientEnv();

  if (typeof window === "undefined") {
    const { API_INTERNAL_URL: internalBase } = getServerEnv();
    if (!normalizedPublic) {
      return `${internalBase}/api/v1`;
    }
    if (normalizedPublic.startsWith("/")) {
      return `${internalBase}${normalizedPublic}`;
    }
    return normalizedPublic;
  }

  return normalizedPublic || "/api/v1";
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}
