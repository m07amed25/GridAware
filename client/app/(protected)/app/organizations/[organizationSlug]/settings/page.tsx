"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Lock,
  Settings,
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
import { useAccessContext } from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";
import { PermissionGate } from "@/components/authorization/permission-gate";
import { ApiClientError } from "@/lib/auth/client";
import {
  archiveOrganization,
  getOrganizationProfile,
  updateOrganizationProfile,
} from "@/lib/authorization/api";
import type { OrganizationProfile } from "@/lib/authorization/types";

const COMMON_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Riyadh",
  "Asia/Dubai",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Tokyo",
];

interface ProfileState {
  organizationId: string;
  profile: OrganizationProfile | null;
  errorStatus: number | null;
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { organizationId, loading: ctxLoading, can } = useAccessContext();
  const [state, setState] = useState<ProfileState | null>(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading) return;
    let cancelled = false;
    void getOrganizationProfile(organizationId)
      .then((res) => {
        if (!cancelled) {
          setState({ organizationId, profile: res.data, errorStatus: null });
          setName(res.data.name);
          setTimezone(res.data.timezone);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            organizationId,
            profile: null,
            errorStatus: err instanceof ApiClientError ? err.status : 500,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, ctxLoading]);

  const loadedForOrg = state?.organizationId === organizationId;

  if (ctxLoading || !loadedForOrg) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (state.errorStatus === 404 || !state.profile) {
    return <PermissionDeniedState variant="not-found" />;
  }

  const canUpdate = can("organization:update");
  const timezoneOptions = [...new Set([timezone, ...COMMON_TIMEZONES])];

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdate || saving) return;
    setFormError(null);
    setSaving(true);
    try {
      const res = await updateOrganizationProfile(organizationId, {
        name: name.trim(),
        timezone,
      });
      setState({ organizationId, profile: res.data, errorStatus: null });
      toast.success("Organization settings saved.");
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to save organization settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (archiving) return;
    setArchiving(true);
    try {
      await archiveOrganization(organizationId);
      toast.success("Organization archived.");
      router.push("/app");
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "Unable to archive organization.",
      );
      setArchiveOpen(false);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
            Organization Settings
          </h1>
          <p className="font-mono text-xs text-[var(--text-muted)]">
            Slug: {state.profile.slug} · Status: {state.profile.status}
          </p>
        </div>
        {!canUpdate ? (
          <Badge variant="secondary">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Read-only (Owner required to edit)</span>
          </Badge>
        ) : null}
      </div>

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-critical)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-strong)]"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-critical)]"
            aria-hidden="true"
          />
          <span>{formError}</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings
              className="h-4 w-4 text-[var(--accent-ink)]"
              aria-hidden="true"
            />
            <span>General profile</span>
          </CardTitle>
          <CardDescription>
            Display name and default timezone for dashboards, schedules, and
            reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-org-name">Organization name</Label>
              <Input
                id="settings-org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canUpdate || saving}
                required
                minLength={2}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-org-timezone">Default timezone</Label>
              <select
                id="settings-org-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!canUpdate || saving}
                className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {canUpdate ? (
              <Button type="submit" disabled={saving}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{saving ? "Saving..." : "Save changes"}</span>
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <PermissionGate requires="organization:archive">
        <Card className="border-[var(--status-critical)]/40">
          <CardHeader>
            <CardTitle className="text-[var(--status-critical)]">
              Danger zone — Archive organization
            </CardTitle>
            <CardDescription>
              Archiving immediately revokes active tenant access for all members
              while retaining historical operational and audit records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setArchiveOpen(true)}
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              <span>Archive organization</span>
            </Button>
          </CardContent>
        </Card>
      </PermissionGate>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive &ldquo;{state.profile.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All members will immediately lose access to this organization.
              Historical telemetry, incidents, and audit records are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiving}
              onClick={() => void handleArchive()}
            >
              {archiving ? "Archiving..." : "Confirm archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
