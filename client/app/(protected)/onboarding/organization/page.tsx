"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
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
import { ApiClientError } from "@/lib/auth/client";
import { createOrganization } from "@/lib/authorization/api";
import { orgOverviewPath } from "@/lib/navigation/location-urls.mjs";

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function CreateOrganizationPage() {
  const router = useRouter();
  const detectedTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const timezoneOptions = useMemo(() => {
    const set = new Set([detectedTz, ...COMMON_TIMEZONES]);
    return [...set];
  }, [detectedTz]);

  const [name, setName] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [timezone, setTimezone] = useState(detectedTz);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? customSlug : slugify(name);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setErrorMessage("Organization name must be at least 2 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createOrganization({
        name: trimmedName,
        ...(effectiveSlug.length >= 2 ? { slug: effectiveSlug } : {}),
        timezone,
      });
      toast.success(`Organization "${response.data.name}" created.`);
      router.push(
        orgOverviewPath(response.data.slug || response.data.organizationId),
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else if (error instanceof TypeError) {
        setErrorMessage(
          "Cannot reach the GridAware API server. Ensure the backend server is running (restart `pnpm dev` if it stopped) and try again.",
        );
      } else {
        setErrorMessage("Unable to create organization. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/app">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to workspace</span>
          </Link>
        </Button>
        <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[var(--text-strong)]">
          Create an organization
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Establish an isolated tenant workspace for your facilities, assets,
          and maintenance team. You will be assigned the initial{" "}
          <strong className="text-[var(--text-strong)]">Owner</strong> role.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2
              className="h-5 w-5 text-[var(--accent-ink)]"
              aria-hidden="true"
            />
            <span>Organization details</span>
          </CardTitle>
          <CardDescription>
            Every organization is isolated from other tenants across API,
            real-time monitoring, exports, and audit logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            {errorMessage ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-critical)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-strong)]"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-critical)]"
                  aria-hidden="true"
                />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                name="name"
                required
                minLength={2}
                maxLength={120}
                placeholder="e.g. North Industrial Power Group"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-slug">Workspace identifier (slug)</Label>
              <Input
                id="org-slug"
                name="slug"
                maxLength={80}
                placeholder="north-industrial-power-group"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setCustomSlug(e.target.value.toLowerCase());
                }}
                disabled={submitting}
                className="font-mono text-sm"
              />
              <p className="text-xs text-[var(--text-muted)]">
                Lowercase letters, numbers, and hyphens only. Leave auto-filled
                or customize.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-timezone">Default operational timezone</Label>
              <select
                id="org-timezone"
                name="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={submitting}
                className="flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)]">
                Stored telemetry and audit instants remain in UTC; display times
                format to your organization or site timezone.
              </p>
            </div>

            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-secondary)]">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-success)]"
                aria-hidden="true"
              />
              <span>
                Your organization and initial Owner membership are created
                atomically and recorded in the tenant audit trail.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" disabled={submitting}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>
                  {submitting
                    ? "Creating organization..."
                    : "Create organization"}
                </span>
              </Button>
              <Button asChild variant="secondary" disabled={submitting}>
                <Link href="/app">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
