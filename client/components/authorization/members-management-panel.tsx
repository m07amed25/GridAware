"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Crown,
  MailPlus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/auth/client";
import {
  createOrganizationInvitation,
  listOrganizationInvitations,
  listOrganizationMembers,
  reactivateMember,
  removeMember,
  revokeOrganizationInvitation,
  suspendMember,
  transferOwnership,
  updateMemberRole,
} from "@/lib/authorization/api";
import {
  ASSIGNABLE_NON_OWNER_ROLES,
  ROLE_LABELS,
} from "@/lib/authorization/permissions.mjs";
import type {
  AssignableNonOwnerRole,
  InvitationSummary,
  MemberSummary,
} from "@/lib/authorization/types";
import { orgOverviewPath } from "@/lib/navigation/location-urls.mjs";
import {
  broadcastOrganizationChanged,
  useAccessContext,
} from "./access-context-provider";
import { PermissionDeniedState } from "./permission-denied-state";
import { RoleBadge } from "./role-badge";

type PendingConfirmAction =
  | { type: "suspend"; member: MemberSummary }
  | { type: "reactivate"; member: MemberSummary }
  | { type: "remove"; member: MemberSummary }
  | null;

interface MembersLoadState {
  key: string;
  members: MemberSummary[];
  nextCursor: string | null;
  hasMore: boolean;
  errorStatus: number | null;
  bannerError: string | null;
}

const ALL_ROLE_FILTERS = [
  "OWNER",
  "FACILITY_MANAGER",
  "ENGINEER",
  "TECHNICIAN",
  "VIEWER",
] as const;

const ALL_STATUS_FILTERS = ["ACTIVE", "SUSPENDED", "REMOVED"] as const;

const PAGE_LIMIT = 25;

export function MembersManagementPanel() {
  const {
    organizationId,
    organizationSlug,
    accessContext,
    loading: ctxLoading,
    can,
    refresh,
  } = useAccessContext();
  const canReadMembers = !ctxLoading && can("members:read");

  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [loadState, setLoadState] = useState<MembersLoadState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<AssignableNonOwnerRole>("ENGINEER");
  const [inviting, setInviting] = useState(false);
  const [latestDevLink, setLatestDevLink] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmAction>(null);

  const [transferTarget, setTransferTarget] = useState<MemberSummary | null>(
    null,
  );
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [previousOwnerNextRole, setPreviousOwnerNextRole] =
    useState<AssignableNonOwnerRole>("FACILITY_MANAGER");

  const queryKey = `${organizationId}|${roleFilter}|${statusFilter}|${refreshTick}`;

  useEffect(() => {
    if (!canReadMembers) {
      return;
    }
    let cancelled = false;
    void Promise.all([
      listOrganizationMembers(organizationId, {
        limit: PAGE_LIMIT,
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
      listOrganizationInvitations(organizationId).catch(() => ({ data: [] })),
    ])
      .then(([membersRes, invitesRes]) => {
        if (!cancelled) {
          setLoadState({
            key: queryKey,
            members: membersRes.data,
            nextCursor: membersRes.meta.pagination.nextCursor,
            hasMore: membersRes.meta.pagination.hasMore,
            errorStatus: null,
            bannerError: null,
          });
          setInvitations(invitesRes.data);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (error instanceof ApiClientError) {
            setLoadState({
              key: queryKey,
              members: [],
              nextCursor: null,
              hasMore: false,
              errorStatus: error.status,
              bannerError: error.message,
            });
          } else {
            setLoadState({
              key: queryKey,
              members: [],
              nextCursor: null,
              hasMore: false,
              errorStatus: 500,
              bannerError: "Unable to load organization members.",
            });
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, canReadMembers, roleFilter, statusFilter, queryKey]);

  const hasCurrentLoad = loadState?.key === queryKey;
  const members = hasCurrentLoad ? loadState.members : [];
  const nextCursor = hasCurrentLoad ? loadState.nextCursor : null;
  const hasMore = hasCurrentLoad ? loadState.hasMore : false;
  const errorStatus = hasCurrentLoad ? loadState.errorStatus : null;
  const bannerError =
    actionError ?? (hasCurrentLoad ? loadState.bannerError : null);

  if (ctxLoading || (canReadMembers && !hasCurrentLoad)) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (errorStatus === 404) {
    return <PermissionDeniedState variant="not-found" />;
  }

  if (!canReadMembers || errorStatus === 403) {
    return (
      <PermissionDeniedState
        variant="forbidden"
        backHref={orgOverviewPath(organizationSlug)}
        backLabel="Back to organization overview"
        title="Member administration is restricted to Owners"
        description="Only active Organization Owners can view, invite, update, suspend, or remove organization members."
      />
    );
  }

  function applyUpdatedMember(updated: MemberSummary) {
    setLoadState((prev) =>
      prev && prev.key === queryKey
        ? {
            ...prev,
            members: prev.members.map((m) =>
              m.membershipId === updated.membershipId ? updated : m,
            ),
          }
        : prev,
    );
  }

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setActionError(null);
    try {
      const response = await listOrganizationMembers(organizationId, {
        limit: PAGE_LIMIT,
        cursor: nextCursor,
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setLoadState((prev) =>
        prev && prev.key === queryKey
          ? {
              ...prev,
              members: [...prev.members, ...response.data],
              nextCursor: response.meta.pagination.nextCursor,
              hasMore: response.meta.pagination.hasMore,
            }
          : prev,
      );
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to load more members.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSendInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviting) return;
    setActionError(null);
    setLatestDevLink(null);
    setInviting(true);
    try {
      const res = await createOrganizationInvitation(organizationId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInvitations((prev) => [
        res.data,
        ...prev.map((inv) =>
          inv.email.toLowerCase() === res.data.email.toLowerCase() &&
          inv.status === "PENDING"
            ? { ...inv, status: "REVOKED" as const }
            : inv,
        ),
      ]);
      setInviteEmail("");
      if (res.data.devAcceptUrl) {
        setLatestDevLink(res.data.devAcceptUrl);
      }
      toast.success(`Invitation sent to ${res.data.email}.`);
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to send invitation.",
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    setBusyId(invitationId);
    setActionError(null);
    try {
      const res = await revokeOrganizationInvitation(
        organizationId,
        invitationId,
      );
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.invitationId === invitationId ? res.data : inv,
        ),
      );
      toast.success("Invitation revoked.");
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to revoke invitation.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(
    member: MemberSummary,
    nextRole: AssignableNonOwnerRole,
  ) {
    setBusyId(member.membershipId);
    setActionError(null);
    try {
      const res = await updateMemberRole(
        organizationId,
        member.membershipId,
        nextRole,
      );
      applyUpdatedMember(res.data);
      toast.success(
        `Updated ${member.displayName} to ${ROLE_LABELS[nextRole]}.`,
      );
      broadcastOrganizationChanged(organizationId);
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to update member role.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function executeConfirmedLifecycleAction() {
    if (!pendingConfirm) return;
    const { type, member } = pendingConfirm;
    setBusyId(member.membershipId);
    setActionError(null);
    try {
      const res =
        type === "suspend"
          ? await suspendMember(organizationId, member.membershipId)
          : type === "reactivate"
            ? await reactivateMember(organizationId, member.membershipId)
            : await removeMember(organizationId, member.membershipId);

      applyUpdatedMember(res.data);
      toast.success(
        type === "suspend"
          ? `${member.displayName} suspended.`
          : type === "reactivate"
            ? `${member.displayName} reactivated.`
            : `${member.displayName} removed from organization.`,
      );
      broadcastOrganizationChanged(organizationId);
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to update membership status.",
      );
    } finally {
      setBusyId(null);
      setPendingConfirm(null);
    }
  }

  async function executeOwnershipTransfer() {
    if (!transferTarget || !transferConfirmed) return;
    setBusyId(transferTarget.membershipId);
    setActionError(null);
    try {
      await transferOwnership(organizationId, {
        targetMembershipId: transferTarget.membershipId,
        confirmTransfer: true,
        previousOwnerNextRole,
      });
      toast.success(
        `Ownership transferred to ${transferTarget.displayName}.`,
      );
      setTransferTarget(null);
      setTransferConfirmed(false);
      broadcastOrganizationChanged(organizationId);
      await refresh();
    } catch (error) {
      setActionError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to transfer organization ownership.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "PENDING",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
            Members &amp; Roles
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Invite team members, filter by role or status, update permissions,
            or transfer organization ownership safely.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setActionError(null);
            setRefreshTick((t) => t + 1);
          }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Refresh</span>
        </Button>
      </div>

      {bannerError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-critical)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-strong)]"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-critical)]"
            aria-hidden="true"
          />
          <span>{bannerError}</span>
        </div>
      ) : null}

      {can("members:invite") ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailPlus
                className="h-4 w-4 text-[var(--color-yellow)]"
                aria-hidden="true"
              />
              <span>Invite a member</span>
            </CardTitle>
            <CardDescription>
              Issue a single-use 7-day invitation bound to the recipient&apos;s
              email address. Ownership cannot be granted through invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => void handleSendInvite(e)}
              className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="engineer@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as AssignableNonOwnerRole)
                  }
                  disabled={inviting}
                  className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                >
                  {ASSIGNABLE_NON_OWNER_ROLES.map((r) => {
                    const assignable = r as AssignableNonOwnerRole;
                    return (
                      <option key={assignable} value={assignable}>
                        {ROLE_LABELS[assignable]}
                      </option>
                    );
                  })}
                </select>
              </div>
              <Button type="submit" disabled={inviting}>
                <MailPlus className="h-4 w-4" aria-hidden="true" />
                <span>{inviting ? "Sending..." : "Send invite"}</span>
              </Button>
            </form>

            {latestDevLink ? (
              <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-yellow)]">
                    Local dev invitation link (console mail mode)
                  </p>
                  <p className="truncate font-mono text-[var(--text-secondary)]">
                    {latestDevLink}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(latestDevLink);
                    toast.success("Invitation link copied.");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy link</span>
                </Button>
              </div>
            ) : null}

            {pendingInvitations.length > 0 ? (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Pending invitations ({pendingInvitations.length})
                </p>
                <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3">
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.invitationId}
                      className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono text-[var(--text-strong)]">
                          {inv.email}
                        </span>
                        <RoleBadge role={inv.role} />
                        <Badge variant="warning">PENDING</Badge>
                      </div>
                      {can("members:revoke-invitation") ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busyId === inv.invitationId}
                          onClick={() =>
                            void handleRevokeInvitation(inv.invitationId)
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Revoke</span>
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Organization roster ({members.length})</CardTitle>
            <CardDescription>
              Generic role changes apply only to non-owner roles. Ownership
              handoff uses the protected transfer action.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-[var(--text-secondary)]">
              <span className="sr-only">Filter by role</span>
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="min-h-[38px] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 text-xs text-[var(--text-strong)]"
              >
                <option value="">All roles</option>
                {ALL_ROLE_FILTERS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[var(--text-secondary)]">
              <span className="sr-only">Filter by status</span>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-[38px] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 text-xs text-[var(--text-strong)]"
              >
                <option value="">All statuses</option>
                {ALL_STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-6 text-sm text-[var(--text-secondary)]">
              No memberships match the selected filters.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {members.map((member) => {
                const isSelf =
                  member.membershipId === accessContext?.membershipId;
                const isOwner = member.role === "OWNER";
                const isRemoved = member.status === "REMOVED";
                const isBusy = busyId === member.membershipId;

                return (
                  <div
                    key={member.membershipId}
                    className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[var(--text-strong)]">
                          {member.displayName}
                        </span>
                        {isSelf ? (
                          <Badge variant="secondary">You</Badge>
                        ) : null}
                        <RoleBadge role={member.role} />
                        <Badge
                          variant={
                            member.status === "ACTIVE"
                              ? "success"
                              : member.status === "SUSPENDED"
                                ? "warning"
                                : "critical"
                          }
                        >
                          {member.status}
                        </Badge>
                      </div>
                      <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                        {member.email}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {can("members:update-role") && !isRemoved ? (
                        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="sr-only">
                            Role for {member.displayName}
                          </span>
                          <select
                            aria-label={`Role for ${member.displayName}`}
                            disabled={isSelf || isOwner || isBusy}
                            value={isOwner ? "" : member.role}
                            onChange={(event) => {
                              const nextRole = event.target
                                .value as AssignableNonOwnerRole;
                              void handleRoleChange(member, nextRole);
                            }}
                            className="min-h-[40px] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 text-sm text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                          >
                            {isOwner ? (
                              <option value="">Owner (transfer only)</option>
                            ) : null}
                            {ASSIGNABLE_NON_OWNER_ROLES.map((roleOpt) => {
                              const assignable =
                                roleOpt as AssignableNonOwnerRole;
                              return (
                                <option key={assignable} value={assignable}>
                                  {ROLE_LABELS[assignable]}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      ) : null}

                      {can("members:suspend") && member.status === "ACTIVE" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() =>
                            setPendingConfirm({ type: "suspend", member })
                          }
                        >
                          <UserX className="h-4 w-4" aria-hidden="true" />
                          <span>Suspend</span>
                        </Button>
                      ) : null}

                      {can("members:suspend") &&
                      member.status === "SUSPENDED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() =>
                            setPendingConfirm({ type: "reactivate", member })
                          }
                        >
                          <UserCheck className="h-4 w-4" aria-hidden="true" />
                          <span>Reactivate</span>
                        </Button>
                      ) : null}

                      {accessContext?.role === "OWNER" &&
                      !isSelf &&
                      !isOwner &&
                      member.status === "ACTIVE" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() => {
                            setTransferTarget(member);
                            setTransferConfirmed(false);
                          }}
                        >
                          <Crown className="h-4 w-4" aria-hidden="true" />
                          <span>Transfer ownership</span>
                        </Button>
                      ) : null}

                      {can("members:remove") && !isRemoved ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isBusy}
                          onClick={() =>
                            setPendingConfirm({ type: "remove", member })
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span>Remove</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                disabled={loadingMore}
                onClick={() => void handleLoadMore()}
              >
                {loadingMore ? "Loading..." : "Load more members"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingConfirm?.type === "suspend"
                ? `Suspend ${pendingConfirm.member.displayName}?`
                : pendingConfirm?.type === "reactivate"
                  ? `Reactivate ${pendingConfirm.member.displayName}?`
                  : `Remove ${pendingConfirm?.member.displayName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConfirm?.type === "suspend"
                ? "This member will immediately lose access to this organization on their next request and active real-time subscriptions will be revoked."
                : pendingConfirm?.type === "reactivate"
                  ? "This member will regain access under their assigned organization role."
                  : "Soft-removing a membership permanently revokes access to this organization while preserving the user's global identity and audit trail. The last active owner cannot be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void executeConfirmedLifecycleAction()}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={transferTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTransferTarget(null);
            setTransferConfirmed(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert
                className="h-5 w-5 text-[var(--status-warning)]"
                aria-hidden="true"
              />
              <span>
                Transfer ownership to {transferTarget?.displayName}?
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This atomic action promotes {transferTarget?.displayName} to
              Organization Owner and changes your role immediately. You will lose
              Owner-only administration access unless promoted again.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--text-primary)]">
                Your new role after transfer
              </span>
              <select
                value={previousOwnerNextRole}
                onChange={(e) =>
                  setPreviousOwnerNextRole(
                    e.target.value as AssignableNonOwnerRole,
                  )
                }
                className="min-h-[40px] w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-strong)]"
              >
                {ASSIGNABLE_NON_OWNER_ROLES.map((r) => {
                  const assignable = r as AssignableNonOwnerRole;
                  return (
                    <option key={assignable} value={assignable}>
                      {ROLE_LABELS[assignable]}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={transferConfirmed}
                onChange={(e) => setTransferConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--color-yellow)]"
              />
              <span>
                I understand this immediately transfers organization ownership
                and will be recorded in the security audit log.
              </span>
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!transferConfirmed}
              onClick={() => void executeOwnershipTransfer()}
            >
              Confirm ownership transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
