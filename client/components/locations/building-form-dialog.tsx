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
import { createBuilding, updateBuilding } from "@/lib/locations/api";
import {
  BUILDING_TYPE_LABELS,
  type BuildingDto,
  type BuildingType,
} from "@/lib/locations/types";
import {
  formatLocationCodePreview,
  validateBuildingFormInput,
} from "@/lib/locations/validation.mjs";

const BUILDING_TYPES = Object.keys(BUILDING_TYPE_LABELS) as BuildingType[];

interface BuildingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  siteId: string;
  siteName?: string;
  mode: "create" | "edit";
  initialBuilding?: BuildingDto | null;
  onSaved: (building: BuildingDto) => void;
}

function BuildingFormBody({
  onOpenChange,
  organizationId,
  siteId,
  mode,
  initialBuilding,
  onSaved,
}: Omit<BuildingFormDialogProps, "open" | "siteName">) {
  const idPrefix = useId();
  const isEdit = mode === "edit" && Boolean(initialBuilding);

  const [code, setCode] = useState(isEdit ? initialBuilding!.code : "");
  const [name, setName] = useState(isEdit ? initialBuilding!.name : "");
  const [type, setType] = useState<BuildingType>(
    isEdit ? initialBuilding!.type : "PRODUCTION",
  );
  const [description, setDescription] = useState(
    isEdit ? (initialBuilding!.description ?? "") : "",
  );
  const [floorCount, setFloorCount] = useState(
    isEdit && initialBuilding!.floorCount !== null
      ? String(initialBuilding!.floorCount)
      : "",
  );
  const [grossAreaSqM, setGrossAreaSqM] = useState(
    isEdit ? (initialBuilding!.grossAreaSqM ?? "") : "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const validationErrors = validateBuildingFormInput({
      mode,
      code,
      name,
      type,
      floorCount,
      grossAreaSqM,
    });
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const parsedFloors = floorCount.trim()
      ? Number.parseInt(floorCount.trim(), 10)
      : null;
    const parsedArea = grossAreaSqM.trim() ? grossAreaSqM.trim() : null;

    setSubmitting(true);
    try {
      const response =
        mode === "create"
          ? await createBuilding(organizationId, siteId, {
              code: formatLocationCodePreview(code),
              name: name.trim(),
              type,
              description: description.trim() || null,
              floorCount: parsedFloors,
              grossAreaSqM: parsedArea,
            })
          : await updateBuilding(organizationId, siteId, initialBuilding!.id, {
              name: name.trim(),
              type,
              description: description.trim() || null,
              floorCount: parsedFloors,
              grossAreaSqM: parsedArea,
            });

      onSaved(response.data);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.problem?.errors?.length) {
          const nextErrors: Record<string, string> = {};
          for (const item of error.problem.errors) {
            if (item.field) {
              nextErrors[item.field] = item.message;
            }
          }
          if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
          }
        }
        setServerError(error.message);
      } else {
        setServerError("Unable to save building. Try again.");
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
          <Label htmlFor={`${idPrefix}-code`}>Building code</Label>
          <Input
            id={`${idPrefix}-code`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={mode === "edit" || submitting}
            placeholder="PROD-HALL-01"
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
                  : "Unique within this site."}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-type`}>Building type</Label>
          <Select
            value={type}
            onValueChange={(next) => {
              setType(next as BuildingType);
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
              <SelectValue placeholder="Select building type" />
            </SelectTrigger>
            <SelectContent>
              {BUILDING_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {BUILDING_TYPE_LABELS[option]}
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

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Building name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          placeholder="Production Hall 1"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-floors`}>Floor count (optional)</Label>
          <Input
            id={`${idPrefix}-floors`}
            value={floorCount}
            onChange={(e) => setFloorCount(e.target.value)}
            disabled={submitting}
            inputMode="numeric"
            className="font-mono"
            placeholder="2"
            aria-invalid={Boolean(fieldErrors.floorCount)}
            aria-describedby={
              fieldErrors.floorCount ? `${idPrefix}-floors-error` : undefined
            }
          />
          {fieldErrors.floorCount ? (
            <p
              id={`${idPrefix}-floors-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.floorCount}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-area`}>
            Gross area in m² (optional)
          </Label>
          <Input
            id={`${idPrefix}-area`}
            value={grossAreaSqM}
            onChange={(e) => setGrossAreaSqM(e.target.value)}
            disabled={submitting}
            inputMode="decimal"
            className="font-mono"
            placeholder="4200.00"
            aria-invalid={Boolean(fieldErrors.grossAreaSqM)}
            aria-describedby={
              fieldErrors.grossAreaSqM ? `${idPrefix}-area-error` : undefined
            }
          />
          {fieldErrors.grossAreaSqM ? (
            <p
              id={`${idPrefix}-area-error`}
              className="text-xs text-[var(--status-critical)]"
            >
              {fieldErrors.grossAreaSqM}
            </p>
          ) : null}
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
          placeholder="Primary assembly floor and overhead crane bay."
          className="flex w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        />
      </div>

      <AlertDialogFooter className="pt-2">
        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
        <Button
          type="submit"
          loading={submitting}
          loadingLabel={mode === "create" ? "Adding building..." : "Saving..."}
        >
          {mode === "create" ? "Add building" : "Save changes"}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

export function BuildingFormDialog(props: BuildingFormDialogProps) {
  const { open, onOpenChange, mode, siteName, initialBuilding } = props;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "create" ? "Add building" : "Edit building details"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "create"
              ? `Register a physical building inside ${siteName ?? "this site"}.`
              : "Update building metadata. Building code and parent site cannot be changed."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {open ? (
          <BuildingFormBody
            key={`${mode}:${initialBuilding?.id ?? "new"}:${initialBuilding?.updatedAt ?? ""}`}
            onOpenChange={onOpenChange}
            organizationId={props.organizationId}
            siteId={props.siteId}
            mode={mode}
            initialBuilding={initialBuilding}
            onSaved={props.onSaved}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
