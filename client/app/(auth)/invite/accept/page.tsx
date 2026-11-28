"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { RoleBadge } from "@/components/authorization/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/auth/client";
import {
  acceptInvitation,
  previewInvitation,
} from "@/lib/authorization/api";
import type { InvitationPreview } from "@/lib/authorization/types";
import { orgOverviewPath } from "@/lib/navigation/location-urls.mjs";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : "Missing invitation token in link.",
  );
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void previewInvitation(token)
      .then((res) => {
        if (!cancelled) {
          setPreview(res.data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof ApiClientError
              ? err.message
              : "This invitation link is invalid or expired.",
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    if (!token || accepting) return;
    setAccepting(true);
    setErrorMessage(null);
    setNeedsSignIn(false);
    try {
      const res = await acceptInvitation(token);
      toast.success(`Joined ${res.data.organizationName}!`);
      router.push(
        orgOverviewPath(res.data.organizationSlug || res.data.organizationId),
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setNeedsSignIn(true);
        setErrorMessage(
          "Sign in with the invited email address to accept this invitation.",
        );
      } else {
        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Unable to accept invitation.",
        );
      }
    } finally {
      setAccepting(false);
    }
  }

  const nextUrl = `/invite/accept?token=${encodeURIComponent(token)}`;

  return (
    <Card className="mx-auto w-full max-w-md border-[var(--border-default)] bg-[var(--surface-1)]">
      <CardHeader className="space-y-2">
        <div className="inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          <span>Organization Invitation</span>
        </div>
        <CardTitle className="text-xl text-[var(--text-strong)]">
          {preview ? `Join ${preview.organizationName}` : "Review invitation"}
        </CardTitle>
        <CardDescription>
          Confirm the organization and assigned role before activating your
          membership.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            {errorMessage ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-critical)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-strong)]"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-critical)]"
                  aria-hidden="true"
                />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {preview ? (
              <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">
                    Proposed role
                  </span>
                  <RoleBadge role={preview.role} showReadOnlyHint />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">
                    Invited account
                  </span>
                  <span className="font-mono text-xs text-[var(--text-strong)]">
                    {preview.invitedEmailMasked}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Status</span>
                  <Badge
                    variant={
                      preview.status === "PENDING" ? "success" : "warning"
                    }
                  >
                    {preview.status}
                  </Badge>
                </div>
              </div>
            ) : null}

            {preview?.status === "PENDING" ? (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={accepting}
                  onClick={() => void handleAccept()}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {accepting ? "Accepting..." : "Accept invitation"}
                  </span>
                </Button>
                {needsSignIn ? (
                  <Button asChild variant="secondary">
                    <Link href={`/login?next=${encodeURIComponent(nextUrl)}`}>
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      <span>Sign in to accept</span>
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button asChild variant="secondary" className="w-full">
                <Link href="/login">Return to sign in</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-64 w-full max-w-md" />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
