"use client";

import Link from "next/link";
import React from "react";
import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PermissionDeniedState({
  variant = "forbidden",
  backHref = "/app",
  backLabel = "Return to workspace",
  title,
  description,
}: {
  variant?: "forbidden" | "not-found";
  backHref?: string;
  backLabel?: string;
  title?: string;
  description?: string;
}) {
  const isNotFound = variant === "not-found";
  const Icon = isNotFound ? ShieldAlert : Lock;
  const resolvedTitle =
    title ??
    (isNotFound ? "Resource unavailable" : "Access restricted for your role");
  const resolvedDescription =
    description ??
    (isNotFound
      ? "This organization or resource could not be found, or your account does not have active access to it."
      : "Your current organization role does not include permission to view or perform this action. Contact an Organization Owner if you need access.");

  return (
    <Card
      role="alert"
      aria-live="polite"
      className="mx-auto max-w-xl border-[var(--border-default)] bg-[var(--surface-1)]"
    >
      <CardHeader className="space-y-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--status-warning)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{isNotFound ? "Unavailable" : "Permission required"}</span>
        </div>
        <CardTitle className="text-xl text-[var(--text-strong)]">
          {resolvedTitle}
        </CardTitle>
        <CardDescription className="text-sm text-[var(--text-secondary)]">
          {resolvedDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="secondary">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{backLabel}</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
