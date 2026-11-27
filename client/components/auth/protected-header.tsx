"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import {
  ChevronDown,
  Compass,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, broadcastSessionInvalidated } from "@/lib/auth/client";
import type { SafeUserProfile } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  {
    href: "/app/profile",
    label: "Profile & Sessions",
    icon: ShieldCheck,
    exact: false,
  },
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ProtectedHeader({ user }: { user: SafeUserProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
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
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 sm:px-8">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link
            href="/app"
            className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
            aria-label="GridAware Dashboard"
          >
            <Image
              src="/brand/gridaware-horizontal-dark.svg"
              alt="GridAware"
              width={118}
              height={28}
              priority
              className="hidden h-7 w-auto sm:block"
            />
            <Image
              src="/brand/gridaware-symbol-small-dark.svg"
              alt="GridAware"
              width={28}
              height={28}
              priority
              className="h-7 w-7 sm:hidden"
            />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-1"
          >
            {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                    isActive
                      ? "bg-[var(--surface-3)] font-semibold text-[var(--text-strong)]"
                      : "font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-[var(--color-yellow)]"
                        : "text-[var(--text-muted)]",
                    )}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account menu for ${user.displayName}`}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              <Avatar className="h-7 w-7 border-[var(--border-default)]">
                <AvatarFallback className="text-[11px] font-semibold text-[var(--color-yellow)]">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[160px] truncate text-[13px] text-[var(--text-strong)] sm:inline">
                {user.displayName}
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 text-[var(--text-muted)]"
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="space-y-0.5">
                <p className="truncate text-sm font-semibold text-[var(--text-strong)]">
                  {user.displayName}
                </p>
                <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/profile">
                <User aria-hidden="true" />
                <span>Profile &amp; active sessions</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/onboarding">
                <Compass aria-hidden="true" />
                <span>Onboarding status</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signingOut}
              onSelect={(event) => {
                event.preventDefault();
                void handleSignOut();
              }}
              className="text-[var(--status-critical)] focus:text-[var(--status-critical)]"
            >
              <LogOut aria-hidden="true" />
              <span>{signingOut ? "Signing out..." : "Sign out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
