export type SessionDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export interface ParsedSessionClient {
  browser: string;
  os: string | null;
  deviceType: SessionDeviceType;
  summary: string;
  raw: string | null;
}

export function parseSessionClient(
  userAgent: string | null | undefined,
): ParsedSessionClient;
