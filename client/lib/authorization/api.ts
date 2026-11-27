import { apiRequest } from "../auth/client";
import type { ApiEnvelope } from "../auth/types";
import type {
  AcceptInvitationResult,
  AccessibleOrganizationSummary,
  AssignableNonOwnerRole,
  InvitationPreview,
  InvitationSummary,
  MemberSummary,
  OrganizationAccessContext,
  OrganizationProfile,
  OwnershipTransferResult,
  PaginatedApiEnvelope,
  RolesMatrixData,
} from "./types";

export function listAccessibleOrganizations(): Promise<
  ApiEnvelope<AccessibleOrganizationSummary[]>
> {
  return apiRequest<AccessibleOrganizationSummary[]>("/organizations", {
    method: "GET",
  });
}

export function createOrganization(input: {
  name: string;
  slug?: string;
  timezone?: string;
}): Promise<ApiEnvelope<AccessibleOrganizationSummary>> {
  return apiRequest<AccessibleOrganizationSummary>("/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getOrganizationProfile(
  organizationId: string,
): Promise<ApiEnvelope<OrganizationProfile>> {
  return apiRequest<OrganizationProfile>(
    `/organizations/${encodeURIComponent(organizationId)}`,
    { method: "GET" },
  );
}

export function updateOrganizationProfile(
  organizationId: string,
  input: { name?: string; timezone?: string },
): Promise<ApiEnvelope<OrganizationProfile>> {
  return apiRequest<OrganizationProfile>(
    `/organizations/${encodeURIComponent(organizationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function archiveOrganization(
  organizationId: string,
): Promise<ApiEnvelope<OrganizationProfile>> {
  return apiRequest<OrganizationProfile>(
    `/organizations/${encodeURIComponent(organizationId)}/archive`,
    {
      method: "POST",
      body: JSON.stringify({ confirmArchive: true }),
    },
  );
}

export function getOrganizationRolesMatrix(
  organizationId: string,
): Promise<ApiEnvelope<RolesMatrixData>> {
  return apiRequest<RolesMatrixData>(
    `/organizations/${encodeURIComponent(organizationId)}/roles-matrix`,
    { method: "GET" },
  );
}

export function getOrganizationAccessContext(
  organizationId: string,
): Promise<ApiEnvelope<OrganizationAccessContext>> {
  return apiRequest<OrganizationAccessContext>(
    `/organizations/${encodeURIComponent(organizationId)}/access-context`,
    { method: "GET" },
  );
}

export function listOrganizationMembers(
  organizationId: string,
  params?: { limit?: number; cursor?: string; status?: string; role?: string },
): Promise<PaginatedApiEnvelope<MemberSummary>> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.cursor) qs.set("cursor", params.cursor);
  if (params?.status) qs.set("status", params.status);
  if (params?.role) qs.set("role", params.role);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return apiRequest<MemberSummary[]>(
    `/organizations/${encodeURIComponent(organizationId)}/members${suffix}`,
    { method: "GET" },
  ) as unknown as Promise<PaginatedApiEnvelope<MemberSummary>>;
}

export function updateMemberRole(
  organizationId: string,
  membershipId: string,
  role: AssignableNonOwnerRole,
): Promise<ApiEnvelope<MemberSummary>> {
  return apiRequest<MemberSummary>(
    `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
}

export function suspendMember(
  organizationId: string,
  membershipId: string,
): Promise<ApiEnvelope<MemberSummary>> {
  return apiRequest<MemberSummary>(
    `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}/suspend`,
    { method: "POST" },
  );
}

export function reactivateMember(
  organizationId: string,
  membershipId: string,
): Promise<ApiEnvelope<MemberSummary>> {
  return apiRequest<MemberSummary>(
    `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}/reactivate`,
    { method: "POST" },
  );
}

export function removeMember(
  organizationId: string,
  membershipId: string,
): Promise<ApiEnvelope<MemberSummary>> {
  return apiRequest<MemberSummary>(
    `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(membershipId)}`,
    { method: "DELETE" },
  );
}

export function transferOwnership(
  organizationId: string,
  input: {
    targetMembershipId: string;
    confirmTransfer: true;
    previousOwnerNextRole?: AssignableNonOwnerRole;
  },
): Promise<ApiEnvelope<OwnershipTransferResult>> {
  return apiRequest<OwnershipTransferResult>(
    `/organizations/${encodeURIComponent(organizationId)}/ownership-transfer`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function listOrganizationInvitations(
  organizationId: string,
): Promise<ApiEnvelope<InvitationSummary[]>> {
  return apiRequest<InvitationSummary[]>(
    `/organizations/${encodeURIComponent(organizationId)}/invitations`,
    { method: "GET" },
  );
}

export function createOrganizationInvitation(
  organizationId: string,
  input: { email: string; role: AssignableNonOwnerRole },
): Promise<ApiEnvelope<InvitationSummary>> {
  return apiRequest<InvitationSummary>(
    `/organizations/${encodeURIComponent(organizationId)}/invitations`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function revokeOrganizationInvitation(
  organizationId: string,
  invitationId: string,
): Promise<ApiEnvelope<InvitationSummary>> {
  return apiRequest<InvitationSummary>(
    `/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitationId)}/revoke`,
    { method: "POST" },
  );
}

export function previewInvitation(
  token: string,
): Promise<ApiEnvelope<InvitationPreview>> {
  return apiRequest<InvitationPreview>(
    `/invitations/preview?token=${encodeURIComponent(token)}`,
    { method: "GET" },
    { retryOnUnauthorized: false },
  );
}

export function acceptInvitation(
  token: string,
): Promise<ApiEnvelope<AcceptInvitationResult>> {
  return apiRequest<AcceptInvitationResult>("/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
