export type MembershipRole =
  | "OWNER"
  | "FACILITY_MANAGER"
  | "ENGINEER"
  | "TECHNICIAN"
  | "VIEWER";

export type AssignableNonOwnerRole = Exclude<MembershipRole, "OWNER">;

export type MembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "REMOVED";

export type OrganizationStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface OrganizationAccessContext {
  organizationId: string;
  membershipId: string;
  role: MembershipRole;
  permissions: readonly string[];
  policyVersion: string;
}

export interface AccessibleOrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  timezone: string;
  membershipId: string;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface OrganizationProfile {
  organizationId: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleMatrixEntry {
  role: MembershipRole;
  label: string;
  summary: string;
  permissions: readonly string[];
}

export interface RolesMatrixData {
  policyVersion: string;
  roles: RoleMatrixEntry[];
}

export interface MemberSummary {
  membershipId: string;
  organizationId: string;
  userId: string;
  email: string;
  displayName: string;
  role: MembershipRole;
  status: MembershipStatus;
  suspendedAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationSummary {
  invitationId: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  devAcceptUrl?: string;
}

export interface InvitationPreview {
  organizationName: string;
  role: MembershipRole;
  invitedEmailMasked: string;
  status: InvitationStatus;
  expiresAt: string;
}

export interface AcceptInvitationResult {
  organizationId: string;
  organizationName: string;
  membershipId: string;
  role: MembershipRole;
}

export interface PaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface PaginatedApiEnvelope<T> {
  data: T[];
  meta: {
    requestId: string;
    servedAt: string;
    pagination: PaginationMeta;
  };
}

export interface OwnershipTransferResult {
  organizationId: string;
  newOwnerMembership: MemberSummary;
  previousOwnerMembership: MemberSummary;
}
