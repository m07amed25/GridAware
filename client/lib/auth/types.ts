export type UserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED";

export interface SafeUserProfile {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionSummary {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  isCurrent: boolean;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    servedAt: string;
  };
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance: string;
  requestId: string;
  errors?: Array<{
    field?: string;
    code: string;
    message: string;
  }>;
}
