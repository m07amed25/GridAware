export type NodeEnv = "development" | "production" | "test";

export interface EnvValidationIssue {
  path: string;
  message: string;
}

export class EnvValidationError extends Error {
  readonly issues: readonly EnvValidationIssue[];

  constructor(scope: string, issues: readonly EnvValidationIssue[]) {
    const details = issues
      .map((issue) => `  - ${issue.path}: ${issue.message}`)
      .join("\n");
    super(`Invalid ${scope} environment configuration:\n${details}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

export interface ClientEnv {
  NEXT_PUBLIC_API_URL: string | undefined;
}

export interface ServerEnv extends ClientEnv {
  NODE_ENV: NodeEnv;
  API_INTERNAL_URL: string;
}

const DEFAULT_INTERNAL_URL = "http://localhost:3001";
const VALID_NODE_ENVS: readonly NodeEnv[] = [
  "development",
  "production",
  "test",
];

function trimToUndefined(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function stripTrailingSlashes(value: string): string {
  if (value === "/") {
    return value;
  }
  return value.replace(/\/+$/, "");
}

function parseHttpUrl(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    !parsed.hostname ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    return null;
  }
  return stripTrailingSlashes(value);
}

function parsePublicApiUrl(value: string): string | null {
  if (value.startsWith("/")) {
    if (value.startsWith("//") || value.includes("?") || value.includes("#")) {
      return null;
    }
    return stripTrailingSlashes(value);
  }
  return parseHttpUrl(value);
}

export function validateClientEnv(raw: {
  NEXT_PUBLIC_API_URL?: string;
}): ClientEnv {
  const issues: EnvValidationIssue[] = [];
  const rawPublicUrl = trimToUndefined(raw.NEXT_PUBLIC_API_URL);

  let publicUrl: string | undefined;
  if (rawPublicUrl !== undefined) {
    const parsed = parsePublicApiUrl(rawPublicUrl);
    if (parsed === null) {
      issues.push({
        path: "NEXT_PUBLIC_API_URL",
        message:
          'Expected a relative path starting with "/" (e.g. "/api/v1") or a valid http(s) URL without query or hash',
      });
    } else {
      publicUrl = parsed;
    }
  }

  if (issues.length > 0) {
    throw new EnvValidationError("client", issues);
  }

  return {
    NEXT_PUBLIC_API_URL: publicUrl,
  };
}

export function validateServerEnv(
  raw: Record<string, string | undefined> = process.env,
): ServerEnv {
  const issues: EnvValidationIssue[] = [];

  const rawNodeEnv = trimToUndefined(raw.NODE_ENV) ?? "development";
  let nodeEnv: NodeEnv = "development";
  if ((VALID_NODE_ENVS as readonly string[]).includes(rawNodeEnv)) {
    nodeEnv = rawNodeEnv as NodeEnv;
  } else {
    issues.push({
      path: "NODE_ENV",
      message: `Expected one of: ${VALID_NODE_ENVS.join(", ")}`,
    });
  }

  const rawPublicUrl = trimToUndefined(raw.NEXT_PUBLIC_API_URL);
  let publicUrl: string | undefined;
  if (rawPublicUrl !== undefined) {
    const parsed = parsePublicApiUrl(rawPublicUrl);
    if (parsed === null) {
      issues.push({
        path: "NEXT_PUBLIC_API_URL",
        message:
          'Expected a relative path starting with "/" (e.g. "/api/v1") or a valid http(s) URL without query or hash',
      });
    } else {
      publicUrl = parsed;
    }
  }

  const rawInternalUrl =
    trimToUndefined(raw.API_INTERNAL_URL) ?? DEFAULT_INTERNAL_URL;
  const internalUrl = parseHttpUrl(rawInternalUrl);
  if (internalUrl === null) {
    issues.push({
      path: "API_INTERNAL_URL",
      message:
        "Expected a valid http(s) URL without query or hash (e.g. http://localhost:3001)",
    });
  }

  if (issues.length > 0) {
    throw new EnvValidationError("client server-side", issues);
  }

  return {
    NODE_ENV: nodeEnv,
    NEXT_PUBLIC_API_URL: publicUrl,
    API_INTERNAL_URL: internalUrl!,
  };
}

/**
 * Reads and validates browser-safe `NEXT_PUBLIC_*` variables.
 * Uses explicit property access so Next.js statically inlines public values in client bundles.
 */
export function getClientEnv(): ClientEnv {
  return validateClientEnv({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });
}

/**
 * Reads and validates server-only + public environment variables for Next.js SSR,
 * route handlers, and `next.config.ts`.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() cannot be called in the browser");
  }
  return validateServerEnv(process.env);
}
