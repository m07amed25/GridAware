"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, broadcastSessionInvalidated } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await apiRequest<{ revoked: boolean }>("/auth/logout", {
        method: "POST",
      });
    } finally {
      broadcastSessionInvalidated("signed-out");
      router.push("/login?reason=signed-out");
      router.refresh();
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={loading}
      loadingLabel="Signing out..."
      onClick={handleSignOut}
      className="min-h-[40px]"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span>Sign out</span>
    </Button>
  );
}
