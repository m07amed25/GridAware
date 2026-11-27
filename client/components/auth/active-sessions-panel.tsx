"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { AuthAlertBanner, AuthButton } from "@/components/auth/auth-primitives";
import { ApiClientError, apiRequest } from "@/lib/auth/client";
import type { AuthSessionSummary } from "@/lib/auth/types";

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ActiveSessionsPanel() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AuthSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialSessions() {
      try {
        const res = await apiRequest<{ sessions: AuthSessionSummary[] }>(
          "/auth/sessions",
        );
        if (!cancelled) {
          setSessions(res.data.sessions);
          setError(null);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiClientError && err.status === 401) {
          router.push("/login?reason=session-expired");
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load active sessions.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialSessions();

    let ch: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      ch = new BroadcastChannel("gridaware:auth");
      ch.onmessage = (event) => {
        if (event.data?.type === "SESSION_INVALIDATED") {
          router.push("/login?reason=session-expired");
        }
      };
    }

    return () => {
      cancelled = true;
      ch?.close();
    };
  }, [router]);

  async function handleRevokeSession(session: AuthSessionSummary) {
    setRevokingId(session.id);
    setError(null);
    try {
      await apiRequest<{ revoked: boolean }>(`/auth/sessions/${session.id}`, {
        method: "DELETE",
      });
      if (session.isCurrent) {
        router.push("/login");
        router.refresh();
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke session.",
      );
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
      if (typeof BroadcastChannel !== "undefined") {
        const ch = new BroadcastChannel("gridaware:auth");
        ch.postMessage({ type: "SESSION_INVALIDATED" });
        ch.close();
      }
      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to sign out of all sessions.",
      );
      setRevokingAll(false);
    }
  }

  return (
    <section
      aria-labelledby="active-sessions-heading"
      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2
            id="active-sessions-heading"
            className="text-lg font-semibold text-[var(--text-strong)]"
          >
            Active sessions
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Devices and browsers currently signed in to your account (maximum 10).
          </p>
        </div>

        {!confirmLogoutAll ? (
          <AuthButton
            variant="destructive"
            onClick={() => setConfirmLogoutAll(true)}
            disabled={loading || sessions.length === 0}
          >
            Sign out of all sessions
          </AuthButton>
        ) : (
          <div className="flex items-center gap-2">
            <AuthButton
              variant="destructive"
              loading={revokingAll}
              loadingLabel="Signing out..."
              onClick={handleLogoutAll}
            >
              Confirm sign out all
            </AuthButton>
            <AuthButton
              variant="secondary"
              disabled={revokingAll}
              onClick={() => setConfirmLogoutAll(false)}
            >
              Cancel
            </AuthButton>
          </div>
        )}
      </div>

      {error ? <AuthAlertBanner tone="error">{error}</AuthAlertBanner> : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-16 rounded-lg bg-[var(--surface-2)]" />
          <div className="h-16 rounded-lg bg-[var(--surface-2)]" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No active sessions found.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-[var(--text-strong)]">
                    {session.userAgent || "Unknown browser or client"}
                  </span>
                  {session.isCurrent ? (
                    <span className="inline-flex items-center rounded-md border border-[var(--status-success)] bg-[var(--status-success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-success)]">
                      Current session
                    </span>
                  ) : null}
                </div>
                <p className="font-mono text-xs text-[var(--text-muted)]">
                  Last active {formatTimestamp(session.lastUsedAt)} · Expires{" "}
                  {formatTimestamp(session.idleExpiresAt)}
                </p>
              </div>

              <AuthButton
                variant="secondary"
                loading={revokingId === session.id}
                loadingLabel="Revoking..."
                onClick={() => handleRevokeSession(session)}
                className="shrink-0"
              >
                {session.isCurrent ? "Sign out" : "Revoke"}
              </AuthButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
