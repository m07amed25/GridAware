"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { AuthButton } from "@/components/auth/auth-primitives";
import { apiRequest } from "@/lib/auth/client";

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
      if (typeof BroadcastChannel !== "undefined") {
        const ch = new BroadcastChannel("gridaware:auth");
        ch.postMessage({ type: "SESSION_INVALIDATED" });
        ch.close();
      }
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <AuthButton
      variant="secondary"
      loading={loading}
      loadingLabel="Signing out..."
      onClick={handleSignOut}
    >
      Sign out
    </AuthButton>
  );
}
