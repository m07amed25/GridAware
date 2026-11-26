export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

const DEFAULT_INTERNAL_URL = "http://localhost:3001";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const normalizedPublic = publicUrl ? stripTrailingSlash(publicUrl) : "";

  if (typeof window === "undefined") {
    const internalBase = stripTrailingSlash(
      process.env.API_INTERNAL_URL?.trim() || DEFAULT_INTERNAL_URL,
    );
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
