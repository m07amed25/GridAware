"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import {
  Building2,
  ChevronDown,
  Compass,
  Eye,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";
import {
  AccessContextProvider,
  useOptionalAccessContext,
} from "@/components/authorization/access-context-provider";
import { OrganizationSwitcher } from "@/components/authorization/organization-switcher";
import { RoleBadge } from "@/components/authorization/role-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LiquidGlassExpandableSidebar,
  type GlassNavGroup,
  type GlassNavItem,
} from "@/components/ui/liquid-glass-expandable-sidebar";
import { apiRequest, broadcastSessionInvalidated } from "@/lib/auth/client";
import type { SafeUserProfile } from "@/lib/auth/types";
import { listAccessibleOrganizations } from "@/lib/authorization/api";
import type { ShellNavIconKey } from "@/lib/navigation/shell-nav";
import {
  buildShellNavGroups,
  extractActiveOrgId,
  getUserInitials,
  resolveActiveSidebarId,
} from "@/lib/navigation/shell-nav.mjs";

const NAV_ICON_BY_KEY: Record<ShellNavIconKey, React.ReactNode> = {
  "workspace-overview": <LayoutDashboard aria-hidden="true" />,
  onboarding: <Compass aria-hidden="true" />,
  "org-overview": <Building2 aria-hidden="true" />,
  "org-sites": <MapPin aria-hidden="true" />,
  "org-members": <Users aria-hidden="true" />,
  "org-roles": <Shield aria-hidden="true" />,
  "org-settings": <Settings aria-hidden="true" />,
};

function resolveNavIcon(iconKey: string): React.ReactNode {
  if (iconKey in NAV_ICON_BY_KEY) {
    return NAV_ICON_BY_KEY[iconKey as ShellNavIconKey];
  }
  return <LayoutDashboard aria-hidden="true" />;
}

const SIDEBAR_GLASS = {
  blur: 6,
  opacity: 0.14,
  saturation: 1.2,
  edge: 0.55,
  distortion: 14,
} as const;

const SIDEBAR_STYLE = {
  "--gn-sidebar-inset": "24px",
} as CSSProperties;

interface OrgNameSnapshot {
  orgId: string;
  name: string | null;
}

function ProtectedShellInner({
  user,
  pathname,
  activeOrgId,
  desktopExpanded,
  onDesktopExpandedChange,
  children,
}: {
  user: SafeUserProfile;
  pathname: string;
  activeOrgId: string | null;
  desktopExpanded: boolean;
  onDesktopExpandedChange: (expanded: boolean) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const orgAccess = useOptionalAccessContext();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }

  const [orgNameSnapshot, setOrgNameSnapshot] =
    useState<OrgNameSnapshot | null>(null);

  useEffect(() => {
    if (!activeOrgId) {
      return;
    }

    let cancelled = false;
    void listAccessibleOrganizations()
      .then((res) => {
        if (cancelled) return;
        const match = res.data.find(
          (org) => org.organizationId === activeOrgId,
        );
        setOrgNameSnapshot({
          orgId: activeOrgId,
          name: match?.name ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setOrgNameSnapshot({
          orgId: activeOrgId,
          name: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  const activeOrgName =
    activeOrgId && orgNameSnapshot?.orgId === activeOrgId
      ? orgNameSnapshot.name
      : null;

  const closeMobileDrawer = useCallback((restoreFocus = false) => {
    setMobileOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        menuButtonRef.current?.focus();
      });
    }
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        closeMobileDrawer(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, closeMobileDrawer]);

  const groups = useMemo<GlassNavGroup[]>(() => {
    const permissions =
      orgAccess && !orgAccess.loading && orgAccess.accessContext
        ? orgAccess.permissions
        : null;

    return buildShellNavGroups({
      activeOrgId,
      activeOrgName,
      permissions,
    }).map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: resolveNavIcon(item.iconKey),
      })),
    }));
  }, [activeOrgId, activeOrgName, orgAccess]);

  const activeId = resolveActiveSidebarId(pathname, activeOrgId);
  const userInitials = useMemo(
    () => getUserInitials(user.displayName),
    [user.displayName],
  );

  const brandIcon = useMemo(
    () => (
      <Image
        src="/brand/gridaware-symbol-small-dark.svg"
        alt=""
        width={22}
        height={22}
        priority
      />
    ),
    [],
  );

  const sidebarAccount = useMemo(
    () => ({
      id: "profile",
      name: user.displayName,
      detail: user.email,
      initials: userInitials,
      href: "/app/profile",
    }),
    [user.displayName, user.email, userInitials],
  );

  const handleNavigate = useCallback(
    (item: GlassNavItem, event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setMobileOpen(false);
      router.push(item.href);
    },
    [router],
  );

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
    <>
      <a
        href="#protected-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-[var(--radius-md)] focus:bg-[var(--color-yellow)] focus:px-4 focus:text-sm focus:font-semibold focus:text-[var(--color-black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        Skip to main content
      </a>

      <div className="flex min-h-svh bg-[var(--surface-canvas)] text-[var(--text-primary)]">
        <aside className="hidden lg:block lg:shrink-0 lg:sticky lg:top-0 lg:h-svh lg:p-3">
          <LiquidGlassExpandableSidebar
            groups={groups}
            activeId={activeId}
            brand="GridAware"
            brandDetail={activeOrgName ?? "Monitoring workspace"}
            brandIcon={brandIcon}
            account={sidebarAccount}
            expanded={desktopExpanded}
            onExpandedChange={onDesktopExpandedChange}
            onNavigate={handleNavigate}
            selectionLight={0.9}
            glass={SIDEBAR_GLASS}
            style={SIDEBAR_STYLE}
          />
        </aside>

        {mobileOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] lg:hidden"
              aria-hidden="true"
              onClick={() => closeMobileDrawer(true)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="fixed inset-y-0 start-0 z-50 flex items-start p-3 lg:hidden"
            >
              <LiquidGlassExpandableSidebar
                groups={groups}
                activeId={activeId}
                brand="GridAware"
                brandDetail={activeOrgName ?? "Monitoring workspace"}
                brandIcon={brandIcon}
                account={sidebarAccount}
                expanded={true}
                onExpandedChange={() => closeMobileDrawer(true)}
                onNavigate={handleNavigate}
                selectionLight={0.9}
                glass={SIDEBAR_GLASS}
                style={SIDEBAR_STYLE}
              />
            </div>
          </>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/90 px-4 backdrop-blur-md sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                ref={menuButtonRef}
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
                className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] lg:hidden"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>

              <OrganizationSwitcher />

              {orgAccess && !orgAccess.loading && orgAccess.accessContext ? (
                <div className="hidden items-center gap-2 sm:flex">
                  <RoleBadge
                    role={orgAccess.accessContext.role}
                    showReadOnlyHint
                  />
                  {orgAccess.isReadOnly ? (
                    <span className="hidden items-center gap-1 text-xs text-[var(--text-muted)] md:inline-flex">
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Read-only</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
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
                      {userInitials}
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
          </header>

          <main
            id="protected-main"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 focus:outline-none sm:px-8 sm:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

export function ProtectedAppShell({
  user,
  children,
}: {
  user: SafeUserProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeOrgId = extractActiveOrgId(pathname);
  const [desktopExpanded, setDesktopExpanded] = useState(true);

  if (activeOrgId) {
    return (
      <AccessContextProvider organizationId={activeOrgId}>
        <ProtectedShellInner
          user={user}
          pathname={pathname}
          activeOrgId={activeOrgId}
          desktopExpanded={desktopExpanded}
          onDesktopExpandedChange={setDesktopExpanded}
        >
          {children}
        </ProtectedShellInner>
      </AccessContextProvider>
    );
  }

  return (
    <ProtectedShellInner
      user={user}
      pathname={pathname}
      activeOrgId={null}
      desktopExpanded={desktopExpanded}
      onDesktopExpandedChange={setDesktopExpanded}
    >
      {children}
    </ProtectedShellInner>
  );
}
