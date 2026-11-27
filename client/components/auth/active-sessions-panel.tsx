"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Globe,
  LogOut,
  Monitor,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiClientError,
  apiRequest,
  broadcastSessionInvalidated,
} from "@/lib/auth/client";
import { formatSessionTimes } from "@/lib/auth/session-time";
import type { AuthSessionSummary } from "@/lib/auth/types";
import {
  parseSessionClient,
  type SessionDeviceType,
} from "@/lib/auth/user-agent-parser";
import { cn } from "@/lib/utils";

const MAX_ACTIVE_SESSIONS = 10;

function DeviceIcon({ type }: { type: SessionDeviceType }) {
  const cls = "h-4 w-4 shrink-0 text-[var(--text-secondary)]";
  switch (type) {
    case "desktop":
      return <Monitor className={cls} aria-hidden="true" />;
    case "mobile":
      return <Smartphone className={cls} aria-hidden="true" />;
    case "tablet":
      return <Tablet className={cls} aria-hidden="true" />;
    default:
      return <Globe className={cls} aria-hidden="true" />;
  }
}

function SessionRow({
  session,
  revoking,
  onRevoke,
}: {
  session: AuthSessionSummary;
  revoking: boolean;
  onRevoke: (session: AuthSessionSummary) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const client = parseSessionClient(session.userAgent);
  const times = formatSessionTimes(session);

  return (
    <li className="py-4 first:pt-2 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border",
              session.isCurrent
                ? "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-2)]",
            )}
          >
            <DeviceIcon type={client.deviceType} />
          </span>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                {client.summary}
              </p>
              {session.isCurrent ? (
                <Badge variant="success">
                  <CheckCircle2 aria-hidden="true" />
                  <span>Current session</span>
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-[var(--text-muted)]">
              <span>
                Last active{" "}
                <span className="text-[var(--text-primary)]">
                  {times.lastActiveRelative}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span>Idle timeout {times.idleExpiresExact}</span>
            </div>

            <p className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
              Max session lifetime {times.absoluteExpiresExact}
            </p>

            {client.raw ? (
              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--color-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  >
                    <span>Client details</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-150",
                        detailsOpen && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1.5">
                  <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-2 font-mono text-[11px] leading-4 break-all text-[var(--text-secondary)]">
                    <p>Last active: {times.lastActiveExact}</p>
                    <p className="mt-1 text-[var(--text-muted)]">{client.raw}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          loading={revoking}
          loadingLabel={session.isCurrent ? "Signing out..." : "Revoking..."}
          onClick={() => onRevoke(session)}
          className="min-h-[44px] shrink-0 sm:min-h-[38px]"
        >
          {session.isCurrent ? "Sign out" : "Revoke"}
        </Button>
      </div>
    </li>
  );
}

export function ActiveSessionsPanel() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AuthSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    message: string;
    requestId?: string;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    const res = await apiRequest<{ sessions: AuthSessionSummary[] }>(
      "/auth/sessions",
    );
    return res.data.sessions;
  }, []);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextSessions = await fetchSessions();
      setSessions(nextSessions);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.push("/login?reason=session-expired");
        return;
      }
      if (err instanceof ApiClientError) {
        setError({
          message: err.message,
          requestId: err.problem?.requestId,
        });
      } else {
        setError({
          message:
            "Unable to load active sessions right now. Check your connection and try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [fetchSessions, router]);

  useEffect(() => {
    let cancelled = false;

    fetchSessions()
      .then((nextSessions) => {
        if (!cancelled) {
          setSessions(nextSessions);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiClientError && err.status === 401) {
          router.push("/login?reason=session-expired");
          return;
        }
        if (err instanceof ApiClientError) {
          setError({
            message: err.message,
            requestId: err.problem?.requestId,
          });
        } else {
          setError({
            message:
              "Unable to load active sessions right now. Check your connection and try again.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      ch = new BroadcastChannel("gridaware:auth");
      ch.onmessage = (event) => {
        if (event.data?.type === "SESSION_INVALIDATED") {
          const reason =
            event.data?.reason === "signed-out"
              ? "signed-out"
              : "session-expired";
          router.push(`/login?reason=${reason}`);
        }
      };
    }

    return () => {
      cancelled = true;
      ch?.close();
    };
  }, [fetchSessions, router]);

  async function handleRevokeSession(session: AuthSessionSummary) {
    setRevokingId(session.id);
    setError(null);
    setStatusNotice(null);
    try {
      await apiRequest<{ revoked: boolean }>(`/auth/sessions/${session.id}`, {
        method: "DELETE",
      });
      if (session.isCurrent) {
        broadcastSessionInvalidated("signed-out");
        router.push("/login?reason=signed-out");
        router.refresh();
        return;
      }
      const parsed = parseSessionClient(session.userAgent);
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      const msg = `Revoked session (${parsed.summary}).`;
      setStatusNotice(msg);
      toast.success("Session revoked", { description: parsed.summary });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setStatusNotice(
          "That session was already expired or revoked. Refreshing active sessions.",
        );
        void handleRetry();
        return;
      }
      if (err instanceof ApiClientError) {
        setError({
          message: err.message,
          requestId: err.problem?.requestId,
        });
      } else {
        setError({
          message: "Failed to revoke session. Try again.",
        });
      }
    } finally {
      setRevokingId(null);
    }
  }

  async function handleLogoutAll() {
    setRevokingAll(true);
    setError(null);
    try {
      await apiRequest<{ revokedCount: number }>("/auth/logout-all", {
        method: "POST",
      });
      broadcastSessionInvalidated("signed-out");
      setDialogOpen(false);
      router.push("/login?reason=signed-out");
      router.refresh();
    } catch (err) {
      setDialogOpen(false);
      if (err instanceof ApiClientError) {
        setError({
          message: err.message,
          requestId: err.problem?.requestId,
        });
      } else {
        setError({
          message: "Failed to sign out of all sessions. Try again.",
        });
      }
      setRevokingAll(false);
    }
  }

  const quotaPercent = Math.min(
    100,
    Math.round((sessions.length / MAX_ACTIVE_SESSIONS) * 100),
  );

  return (
    <Card aria-labelledby="active-sessions-heading">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <CardTitle id="active-sessions-heading" className="text-lg">
              Active sessions
            </CardTitle>
            {!loading ? (
              <Badge variant="default" className="font-mono tabular-nums">
                {sessions.length} of {MAX_ACTIVE_SESSIONS} active
              </Badge>
            ) : null}
          </div>
          <CardDescription>
            Browsers and devices currently signed in to your account. When you
            exceed {MAX_ACTIVE_SESSIONS} active sessions, the least-recently
            used session is automatically revoked.
          </CardDescription>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={loading || sessions.length === 0}
              className="shrink-0"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign out of all sessions</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical)]"
                >
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <AlertDialogTitle>
                  Sign out of all active sessions?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription>
                This immediately revokes all {sessions.length} active{" "}
                {sessions.length === 1 ? "session" : "sessions"}—including this
                browser and any other open tabs. You will need to sign in again
                with your email and passphrase.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revokingAll}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={revokingAll}
                onClick={(event) => {
                  event.preventDefault();
                  void handleLogoutAll();
                }}
              >
                {revokingAll ? "Signing out..." : "Sign out all sessions"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>

      <CardContent className="space-y-5">
        {!loading && sessions.length > 0 ? (
          <div className="space-y-1.5">
            <Progress
              value={quotaPercent}
              aria-label="Active session quota usage"
              aria-valuetext={`${sessions.length} of ${MAX_ACTIVE_SESSIONS} active sessions`}
              indicatorClassName={
                sessions.length >= 9
                  ? "bg-[var(--status-warning)]"
                  : "bg-[var(--color-yellow)]"
              }
            />
          </div>
        ) : null}

        {statusNotice ? (
          <Alert variant="success">
            <AlertDescription>{statusNotice}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="error">
            <AlertTitle>Unable to complete session request</AlertTitle>
            <AlertDescription className="space-y-2.5">
              <p>{error.message}</p>
              {error.requestId ? (
                <p className="font-mono text-[11px] text-[var(--text-muted)]">
                  Reference ID: {error.requestId}
                </p>
              ) : null}
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleRetry()}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retry</span>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="space-y-4 border-t border-[var(--border-subtle)] pt-4" aria-busy="true">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 shrink-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3.5 w-64" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24 shrink-0" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="border-t border-[var(--border-subtle)] pt-5 text-sm text-[var(--text-muted)]">
            No active sessions found for this account.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                revoking={revokingId === session.id}
                onRevoke={handleRevokeSession}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
