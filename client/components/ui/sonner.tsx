"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
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
