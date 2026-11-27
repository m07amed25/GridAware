"use client";

import React, { useId, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TimeZoneCombobox } from "@/components/locations/time-zone-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiClientError } from "@/lib/auth/client";
import { createSite, updateSite } from "@/lib/locations/api";
import {
  SITE_TYPE_LABELS,
  type SiteDto,
  type SiteType,
} from "@/lib/locations/types";
import {
  formatLocationCodePreview,
  formatSiteLocalTime,
  validateSiteFormInput,
} from "@/lib/locations/validation.mjs";

const SITE_TYPES = Object.keys(SITE_TYPE_LABELS) as SiteType[];

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  mode: "create" | "edit";
  initialSite?: SiteDto | null;
  onSaved: (site: SiteDto) => void;
}

function SiteFormBody({
  onOpenChange,
  organizationId,
  mode,
  initialSite,
  onSaved,
}: Omit<SiteFormDialogProps, "open">) {
  const idPrefix = useId();
  const isEdit = mode === "edit" && Boolean(initialSite);

  const [code, setCode] = useState(isEdit ? initialSite!.code : "");
  const [name, setName] = useState(isEdit ? initialSite!.name : "");
  const [type, setType] = useState<SiteType>(
    isEdit ? initialSite!.type : "FACTORY",
  );
  const [timeZone, setTimeZone] = useState(
    isEdit ? initialSite!.timeZone : "Africa/Cairo",
  );
  const [description, setDescription] = useState(
    isEdit ? (initialSite!.description ?? "") : "",
  );
  const [addressLine1, setAddressLine1] = useState(
    isEdit ? (initialSite!.addressLine1 ?? "") : "",
  );
  const [addressLine2, setAddressLine2] = useState(
    isEdit ? (initialSite!.addressLine2 ?? "") : "",
  );
  const [city, setCity] = useState(isEdit ? (initialSite!.city ?? "") : "");
  const [region, setRegion] = useState(
    isEdit ? (initialSite!.region ?? "") : "",
  );
  const [postalCode, setPostalCode] = useState(
    isEdit ? (initialSite!.postalCode ?? "") : "",
  );
  const [countryCode, setCountryCode] = useState(
    isEdit ? (initialSite!.countryCode ?? "") : "",
  );
  const [latitude, setLatitude] = useState(
    isEdit && initialSite!.latitude !== null
      ? String(initialSite!.latitude)
      : "",
  );
  const [longitude, setLongitude] = useState(
    isEdit && initialSite!.longitude !== null
      ? String(initialSite!.longitude)
      : "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const validationErrors = validateSiteFormInput({
      mode,
      code,
      name,
      type,
      timeZone,
      countryCode,
      latitude,
      longitude,
    });
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const parsedLat = latitude.trim() ? Number(latitude.trim()) : null;
    const parsedLng = longitude.trim() ? Number(longitude.trim()) : null;

    setSubmitting(true);
    try {
      const response =
        mode === "create"
          ? await createSite(organizationId, {
              code: formatLocationCodePreview(code),
              name: name.trim(),
              type,
              timeZone: timeZone.trim(),
              description: description.trim() || null,
              addressLine1: addressLine1.trim() || null,
              addressLine2: addressLine2.trim() || null,
              city: city.trim() || null,
              region: region.trim() || null,
              postalCode: postalCode.trim() || null,
              countryCode: countryCode.trim()
                ? countryCode.trim().toUpperCase()
                : null,
              latitude: parsedLat,
              longitude: parsedLng,
            })
          : await updateSite(organizationId, initialSite!.id, {
              name: name.trim(),
              type,
              timeZone: timeZone.trim(),
              description: description.trim() || null,
              addressLine1: addressLine1.trim() || null,
              addressLine2: addressLine2.trim() || null,
              city: city.trim() || null,
              region: region.trim() || null,
              postalCode: postalCode.trim() || null,
              countryCode: countryCode.trim()
                ? countryCode.trim().toUpperCase()
                : null,
              latitude: parsedLat,
              longitude: parsedLng,
            });

      onSaved(response.data);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.problem?.errors?.length) {
          const nextFieldErrors: Record<string, string> = {};
          for (const item of error.problem.errors) {
            if (item.field) {
              nextFieldErrors[item.field] = item.message;
            }
          }
          if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
          }
        }
        setServerError(error.message);
      } else {
        setServerError("Unable to save site. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const codePreview = formatLocationCodePreview(code);
  const errorCount = Object.keys(fieldErrors).length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError || errorCount > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] px-3.5 py-2.5 text-sm text-[var(--status-critical)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {serverError ??
              `Fix ${errorCount} highlighted ${errorCount === 1 ? "field" : "fields"} before saving.`}
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-code`}>Site code</Label>
          <Input
            id={`${idPrefix}-code`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={mode === "edit" || submitting}
            placeholder="CAI-PLANT-01"
            className="font-mono uppercase"
            aria-invalid={Boolean(fieldErrors.code)}
            aria-describedby={
              fieldErrors.code
                ? `${idPrefix}-code-error`
                : `${idPrefix}-code-hint`
            }
          />
          {fieldErrors.code ? (
            <p
              id={`${idPrefix}-code-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.code}
            </p>
          ) : (
            <p
              id={`${idPrefix}-code-hint`}
              className="text-xs text-[var(--text-muted)]"
            >
              {mode === "edit"
                ? "Immutable identifier."
                : codePreview
                  ? `Normalized code: ${codePreview}`
                  : "2–32 chars, letters, digits, single hyphens."}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-type`}>Facility type</Label>
          <Select
            value={type}
            onValueChange={(next) => {
              setType(next as SiteType);
              if (fieldErrors.type) {
                setFieldErrors((prev) => {
                  const updated = { ...prev };
                  delete updated.type;
                  return updated;
                });
              }
            }}
            disabled={submitting}
          >
            <SelectTrigger
              id={`${idPrefix}-type`}
              aria-invalid={Boolean(fieldErrors.type)}
              aria-describedby={
                fieldErrors.type ? `${idPrefix}-type-error` : undefined
              }
            >
              <SelectValue placeholder="Select facility type" />
            </SelectTrigger>
            <SelectContent>
              {SITE_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {SITE_TYPE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.type ? (
            <p
              id={`${idPrefix}-type-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.type}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-name`}>Site name</Label>
          <Input
            id={`${idPrefix}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            placeholder="Cairo Manufacturing Plant"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? `${idPrefix}-name-error` : undefined
            }
          />
          {fieldErrors.name ? (
            <p
              id={`${idPrefix}-name-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-tz`}>IANA time zone</Label>
          <TimeZoneCombobox
            id={`${idPrefix}-tz`}
            value={timeZone}
            onValueChange={(next) => {
              setTimeZone(next);
              if (fieldErrors.timeZone) {
                setFieldErrors((prev) => {
                  const updated = { ...prev };
                  delete updated.timeZone;
                  return updated;
                });
              }
            }}
            disabled={submitting}
            invalid={Boolean(fieldErrors.timeZone)}
            ariaDescribedBy={
              fieldErrors.timeZone
                ? `${idPrefix}-tz-error`
                : `${idPrefix}-tz-hint`
            }
          />
          {fieldErrors.timeZone ? (
            <p
              id={`${idPrefix}-tz-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.timeZone}
            </p>
          ) : (
            <p
              id={`${idPrefix}-tz-hint`}
              className="text-xs text-[var(--text-muted)]"
            >
              Site local time:{" "}
              <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                {formatSiteLocalTime(timeZone)}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-desc`}>Description (optional)</Label>
        <textarea
          id={`${idPrefix}-desc`}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          maxLength={2000}
          placeholder="Primary industrial production campus and utility infrastructure."
          className="flex w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-addr1`}>Address line 1</Label>
          <Input
            id={`${idPrefix}-addr1`}
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            disabled={submitting}
            placeholder="10th of Ramadan Industrial Zone"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-addr2`}>Address line 2</Label>
          <Input
            id={`${idPrefix}-addr2`}
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            disabled={submitting}
            placeholder="Sector B4"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-city`}>City</Label>
          <Input
            id={`${idPrefix}-city`}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={submitting}
            placeholder="Cairo"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-region`}>Region</Label>
          <Input
            id={`${idPrefix}-region`}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={submitting}
            placeholder="Cairo Governorate"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-postal`}>Postal code</Label>
          <Input
            id={`${idPrefix}-postal`}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            disabled={submitting}
            className="font-mono"
            placeholder="11835"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-country`}>Country (ISO-2)</Label>
          <Input
            id={`${idPrefix}-country`}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            disabled={submitting}
            maxLength={2}
            className="font-mono uppercase"
            placeholder="EG"
            aria-invalid={Boolean(fieldErrors.countryCode)}
            aria-describedby={
              fieldErrors.countryCode ? `${idPrefix}-country-error` : undefined
            }
          />
          {fieldErrors.countryCode ? (
            <p
              id={`${idPrefix}-country-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.countryCode}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-lat`}>Latitude (optional)</Label>
          <Input
            id={`${idPrefix}-lat`}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            disabled={submitting}
            inputMode="decimal"
            className="font-mono"
            placeholder="30.0444"
            aria-invalid={Boolean(fieldErrors.latitude)}
            aria-describedby={
              fieldErrors.latitude ? `${idPrefix}-lat-error` : undefined
            }
          />
          {fieldErrors.latitude ? (
            <p
              id={`${idPrefix}-lat-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.latitude}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-lng`}>Longitude (optional)</Label>
          <Input
            id={`${idPrefix}-lng`}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            disabled={submitting}
            inputMode="decimal"
            className="font-mono"
            placeholder="31.2357"
            aria-invalid={Boolean(fieldErrors.longitude)}
            aria-describedby={
              fieldErrors.longitude ? `${idPrefix}-lng-error` : undefined
            }
          />
          {fieldErrors.longitude ? (
            <p
              id={`${idPrefix}-lng-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.longitude}
            </p>
          ) : null}
        </div>
      </div>

      <AlertDialogFooter className="pt-2">
        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
        <Button
          type="submit"
          loading={submitting}
          loadingLabel={mode === "create" ? "Creating site..." : "Saving..."}
        >
          {mode === "create" ? "Create site" : "Save changes"}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

export function SiteFormDialog(props: SiteFormDialogProps) {
  const { open, onOpenChange, mode, initialSite } = props;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "create" ? "Create site" : "Edit site details"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "create"
              ? "Register a physical facility, plant, campus, or commercial property under this organization."
              : "Update site metadata. Site codes are permanent once created."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {open ? (
          <SiteFormBody
            key={`${mode}:${initialSite?.id ?? "new"}:${initialSite?.updatedAt ?? ""}`}
            onOpenChange={onOpenChange}
            organizationId={props.organizationId}
            mode={mode}
            initialSite={initialSite}
            onSaved={props.onSaved}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
