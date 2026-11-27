import React from "react";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthSplitShell>{children}</AuthSplitShell>;
}
