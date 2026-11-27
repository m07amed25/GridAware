"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-primary)] text-sm",
          title: "font-medium text-[var(--text-strong)]",
          description: "text-xs text-[var(--text-secondary)]",
          actionButton:
            "bg-[var(--color-yellow)] text-[var(--color-black)] font-semibold",
          cancelButton:
            "bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-default)]",
          closeButton:
            "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-strong)]",
        },
      }}
      {...props}
    />
  );
}
