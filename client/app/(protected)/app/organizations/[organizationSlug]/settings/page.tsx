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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccessContext } from "@/components/authorization/access-context-provider";
import { PermissionDeniedState } from "@/components/authorization/permission-denied-state";
import { PermissionGate } from "@/components/authorization/permission-gate";
import { TimeZoneCombobox } from "@/components/locations/time-zone-combobox";
import { ApiClientError } from "@/lib/auth/client";
import {
  archiveOrganization,
  getOrganizationProfile,
  updateOrganizationProfile,
} from "@/lib/authorization/api";
import type { OrganizationProfile } from "@/lib/authorization/types";

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
      <div className="w-full space-y-6" aria-busy="true">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (state.errorStatus === 404 || !state.profile) {
    return <PermissionDeniedState variant="not-found" />;
  }

  const canUpdate = can("organization:update");

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
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-[28px] font-semibold leading-8 tracking-[-0.02em] text-[var(--text-strong)]">
            Organization Settings
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs text-[var(--text-muted)]">
              Slug: {state.profile.slug}
            </p>
            <Badge
              variant={
                state.profile.status === "ACTIVE" ? "success" : "secondary"
              }
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-current"
                aria-hidden="true"
              />
              <span>Status: {state.profile.status}</span>
            </Badge>
          </div>
        </div>
        {!canUpdate ? (
          <Badge variant="secondary" className="self-start">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Read-only (Owner required to edit)</span>
          </Badge>
        ) : null}
      </div>

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] px-4 py-3 text-sm text-[var(--text-strong)]"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-critical)]"
            aria-hidden="true"
          />
          <span>{formError}</span>
        </div>
      ) : null}

      <Card>
        <form onSubmit={(event) => void handleSave(event)}>
          <CardHeader className="gap-1.5 border-b border-[var(--border-subtle)]">
            <CardTitle className="flex items-center gap-2">
              <Settings
                className="h-4 w-4 text-[var(--color-yellow)]"
                aria-hidden="true"
              />
              <span>General profile</span>
            </CardTitle>
            <CardDescription>
              Display name and default timezone for dashboards, schedules, and
              reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-org-name">Organization name</Label>
                <Input
                  id="settings-org-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={!canUpdate || saving}
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-org-timezone">Default timezone</Label>
                <TimeZoneCombobox
                  id="settings-org-timezone"
                  value={timezone}
                  onValueChange={setTimezone}
                  disabled={!canUpdate || saving}
                  ariaDescribedBy="settings-org-timezone-hint"
                />
                <p
                  id="settings-org-timezone-hint"
                  className="text-xs leading-4 text-[var(--text-muted)]"
                >
                  Search by city, region, or UTC offset.
                </p>
              </div>
            </div>
          </CardContent>
          {canUpdate ? (
            <CardFooter className="justify-end border-t border-[var(--border-subtle)] px-6 py-4">
              <Button type="submit" loading={saving}>
                {!saving ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : null}
                <span>{saving ? "Saving..." : "Save changes"}</span>
              </Button>
            </CardFooter>
          ) : null}
        </form>
      </Card>

      <PermissionGate requires="organization:archive">
        <Card className="border-[var(--status-critical-border)]">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-[var(--status-critical)]">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <span>Danger zone — Archive organization</span>
              </CardTitle>
              <CardDescription className="max-w-2xl">
                Archiving immediately revokes active tenant access for all
                members while retaining historical operational and audit
                records.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setArchiveOpen(true)}
              className="self-start md:self-auto"
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              <span>Archive organization</span>
            </Button>
          </div>
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
