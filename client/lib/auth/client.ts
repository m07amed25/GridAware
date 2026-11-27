import { createRefreshCoordinator } from "./refresh-coordinator.mjs";
import type { ApiEnvelope, ProblemDetails } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/api/v1";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const NO_REFRESH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/csrf",
]);

function broadcastAuthEvent(event: {
  type: "SESSION_REFRESHED" | "SESSION_INVALIDATED";
}) {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }
  const channel = new BroadcastChannel("gridaware:auth");
  channel.postMessage(event);
  channel.close();
}

const refreshCoordinator = createRefreshCoordinator({
  executeRefresh: async () => {
    try {
      const csrf = await ensureCsrfToken();
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          "X-CSRF-Token": csrf,
        },
        credentials: "include",
      });
      return response.ok;
    } catch {
      return false;
    }
  },
  broadcast: broadcastAuthEvent,
});

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly problem?: ProblemDetails;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    code: string,
    problem?: ProblemDetails,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.problem = problem;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function readCsrfCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const cookies = document.cookie.split(";");
  for (const part of cookies) {
    const trimmed = part.trim();
    if (trimmed.startsWith("ga_csrf=")) {
      return decodeURIComponent(trimmed.slice("ga_csrf=".length));
    }
  }
  return null;
}

export async function ensureCsrfToken(): Promise<string> {
  const existing = readCsrfCookie();
  if (existing) {
    return existing;
  }
  const response = await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw new ApiClientError(
      "Unable to initialize security token.",
      response.status,
      "CSRF_BOOTSTRAP_FAILED",
    );
  }
  const refreshed = readCsrfCookie();
  if (refreshed) {
    return refreshed;
  }
  const payload = (await response.json()) as ApiEnvelope<{ csrfToken: string }>;
  return payload.data.csrfToken;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { retryOnUnauthorized?: boolean } = {},
): Promise<ApiEnvelope<T>> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (MUTATING_METHODS.has(method)) {
    const csrf = await ensureCsrfToken();
    headers.set("X-CSRF-Token", csrf);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });

  if (
    response.status === 401 &&
    options.retryOnUnauthorized !== false &&
    !NO_REFRESH_PATHS.has(path)
  ) {
    const refreshed = await refreshCoordinator.refreshOnce();
    if (refreshed) {
      const retryHeaders = new Headers(init.headers);
      if (init.body && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }
      if (MUTATING_METHODS.has(method)) {
        const nextCsrf = await ensureCsrfToken();
        retryHeaders.set("X-CSRF-Token", nextCsrf);
      }
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...init,
        method,
        headers: retryHeaders,
        credentials: "include",
      });
      if (!retryResponse.ok) {
        throw await toApiClientError(retryResponse);
      }
      return (await retryResponse.json()) as ApiEnvelope<T>;
    }
    throw await toApiClientError(response);
  }

  if (!response.ok) {
    throw await toApiClientError(response);
  }

  return (await response.json()) as ApiEnvelope<T>;
}

async function toApiClientError(response: Response): Promise<ApiClientError> {
  const retryHeader = response.headers.get("Retry-After");
  const retryAfterSeconds = retryHeader
    ? Number.parseInt(retryHeader, 10)
    : undefined;

  try {
    const problem = (await response.json()) as ProblemDetails;
    return new ApiClientError(
      problem.detail || problem.title || "Request failed",
      response.status,
      problem.code || "REQUEST_FAILED",
      problem,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    );
  } catch {
    return new ApiClientError(
      `Request failed with status ${response.status}`,
      response.status,
      "REQUEST_FAILED",
      undefined,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    );
  }
}
