"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Activity,
  Building2,
  ChevronDown,
  Compass,
  Cpu,
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
import {
  AnimatedSidebar,
  type AnimatedSidebarGroup,
  type AnimatedSidebarItem,
} from "@/components/ui/animated-sidebar";
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
import { listAccessibleOrganizations } from "@/lib/authorization/api";
import type {
  ShellNavIconKey,
  ShellPathStore,
} from "@/lib/navigation/shell-nav";
import {
  buildShellNavGroups,
  createShellPathStore,
  getUserInitials,
  resolveActiveSidebarId,
} from "@/lib/navigation/shell-nav.mjs";

const SIDEBAR_STORAGE_KEY = "gridaware.sidebar.expanded";
const SIDEBAR_STORAGE_EVENT = "gridaware:sidebar-expanded-change";

function subscribeSidebarExpanded(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SIDEBAR_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);
  };
}

function getSidebarExpandedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function getSidebarExpandedServerSnapshot(): boolean {
  return true;
}

function writeSidebarExpanded(expanded: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(expanded));
  } catch {
    // Ignore storage write failures (private mode / quota restrictions)
  }
  window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
}

const NAV_ICON_BY_KEY: Record<ShellNavIconKey, React.ReactNode> = {
  "workspace-overview": <LayoutDashboard aria-hidden="true" />,
  onboarding: <Compass aria-hidden="true" />,
  "org-overview": <Building2 aria-hidden="true" />,
  "org-sites": <MapPin aria-hidden="true" />,
  "org-devices": <Cpu aria-hidden="true" />,
  "org-sensors": <Activity aria-hidden="true" />,
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

function ProtectedPathnameBridge({ store }: { store: ShellPathStore }) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    store.setPathname(pathname);
  }, [pathname, store]);

  return null;
}

interface OrgNameSnapshot {
  orgRef: string;
  orgId: string | null;
  orgSlug: string | null;
  name: string | null;
}

function ProtectedSidebar({
  user,
  pathname,
  activeOrgId,
  mobile = false,
  onClose,
  onItemClick,
}: {
  user: SafeUserProfile;
  pathname: string;
  activeOrgId: string | null;
  mobile?: boolean;
  onClose?: () => void;
  onItemClick?: (item: AnimatedSidebarItem) => void;
}) {
  const orgAccess = useOptionalAccessContext();
  const desktopExpanded = useSyncExternalStore(
    subscribeSidebarExpanded,
    getSidebarExpandedSnapshot,
    getSidebarExpandedServerSnapshot,
  );
  const [orgNameSnapshot, setOrgNameSnapshot] =
    useState<OrgNameSnapshot | null>(null);
  const orgNameSnapshotRef = useRef<OrgNameSnapshot | null>(null);

  const handleDesktopExpandedChange = useCallback((expanded: boolean) => {
    writeSidebarExpanded(expanded);
  }, []);

  useEffect(() => {
    if (!activeOrgId) {
      return;
    }

    const normalizedActive = activeOrgId.toLowerCase();
    const cached = orgNameSnapshotRef.current;
    if (
      cached &&
      (cached.orgRef.toLowerCase() === normalizedActive ||
        cached.orgId === activeOrgId ||
        cached.orgSlug?.toLowerCase() === normalizedActive)
    ) {
      return;
    }

    let cancelled = false;
    void listAccessibleOrganizations()
      .then((res) => {
        if (cancelled) return;
        const match = res.data.find(
          (org) =>
            org.slug.toLowerCase() === normalizedActive ||
            org.organizationId === activeOrgId,
        );
        const next: OrgNameSnapshot = {
          orgRef: activeOrgId,
          orgId: match?.organizationId ?? null,
          orgSlug: match?.slug ?? null,
          name: match?.name ?? null,
        };
        orgNameSnapshotRef.current = next;
        setOrgNameSnapshot(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: OrgNameSnapshot = {
          orgRef: activeOrgId,
          orgId: null,
          orgSlug: null,
          name: null,
        };
        orgNameSnapshotRef.current = next;
        setOrgNameSnapshot(next);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  const normalizedActiveOrgId = activeOrgId?.toLowerCase() ?? null;
  const activeOrgName =
    activeOrgId &&
    orgNameSnapshot &&
    (orgNameSnapshot.orgRef.toLowerCase() === normalizedActiveOrgId ||
      orgNameSnapshot.orgId === activeOrgId ||
      orgNameSnapshot.orgSlug?.toLowerCase() === normalizedActiveOrgId)
      ? orgNameSnapshot.name
      : null;

  const groups = useMemo<AnimatedSidebarGroup[]>(() => {
    const permissions =
      orgAccess && !orgAccess.loading && orgAccess.accessContext
        ? orgAccess.permissions
        : null;
    const navOrgSlug =
      orgAccess?.accessContext?.organizationSlug &&
      orgAccess.accessContext.organizationSlug.length > 0
        ? orgAccess.accessContext.organizationSlug
        : activeOrgId;

    return buildShellNavGroups({
      activeOrgId: navOrgSlug,
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

  const expandedBrand = useMemo(
    () => (
      <Image
        src="/brand/gridaware-horizontal-dark.svg"
        alt="GridAware"
        width={161}
        height={40}
        priority
      />
    ),
    [],
  );

  const collapsedBrand = useMemo(
    () => (
      <Image
        src="/brand/gridaware-symbol-small-dark.svg"
        alt=""
        width={28}
        height={28}
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

  return (
    <AnimatedSidebar
      groups={groups}
      activeId={activeId}
      expanded={mobile ? true : desktopExpanded}
      onExpandedChange={handleDesktopExpandedChange}
      onItemClick={onItemClick}
      brand={expandedBrand}
      collapsedBrand={collapsedBrand}
      brandHref="/app"
      brandLabel="GridAware Dashboard"
      account={sidebarAccount}
      hideCollapseButton={mobile}
      onClose={onClose}
      ariaLabel="GridAware navigation"
    />
  );
}

const ProtectedShellHeader = memo(function ProtectedShellHeader({
  user,
  mobileOpen,
  menuButtonRef,
  onOpenNavigation,
}: {
  user: SafeUserProfile;
  mobileOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onOpenNavigation: () => void;
}) {
  const router = useRouter();
  const orgAccess = useOptionalAccessContext();
  const [signingOut, setSigningOut] = useState(false);
  const userInitials = useMemo(
    () => getUserInitials(user.displayName),
    [user.displayName],
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          ref={menuButtonRef}
          onClick={onOpenNavigation}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] lg:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <Suspense
          fallback={
            <div
              className="h-9 w-40 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-2)]"
              aria-hidden="true"
            />
          }
        >
          <OrganizationSwitcher />
        </Suspense>

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
  );
});

function ProtectedShellInner({
  user,
  pathname,
  activeOrgId,
  children,
}: {
  user: SafeUserProfile;
  pathname: string;
  activeOrgId: string | null;
  children: React.ReactNode;
}) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }

  const openMobileDrawer = useCallback(() => {
    setMobileOpen(true);
  }, []);

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
    const handlePopState = () => setMobileOpen(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [mobileOpen, closeMobileDrawer]);

  const handleMobileItemClick = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <>
      <a
        href="#protected-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-[var(--radius-md)] focus:bg-[var(--color-yellow)] focus:px-4 focus:text-sm focus:font-semibold focus:text-[var(--color-black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        Skip to main content
      </a>

      <div className="flex min-h-svh bg-[var(--surface-canvas)] text-[var(--text-primary)]">
        <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-svh lg:shrink-0">
          <ProtectedSidebar
            user={user}
            pathname={pathname}
            activeOrgId={activeOrgId}
          />
        </aside>

        {mobileOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] lg:hidden"
              aria-hidden="true"
              onClick={() => closeMobileDrawer(true)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="fixed inset-y-0 start-0 z-50 flex lg:hidden"
            >
              <ProtectedSidebar
                user={user}
                pathname={pathname}
                activeOrgId={activeOrgId}
                mobile
                onClose={() => closeMobileDrawer(true)}
                onItemClick={handleMobileItemClick}
              />
            </div>
          </>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <ProtectedShellHeader
            user={user}
            mobileOpen={mobileOpen}
            menuButtonRef={menuButtonRef}
            onOpenNavigation={openMobileDrawer}
          />

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
  const [pathStore] = useState(createShellPathStore);
  const { pathname, activeOrgId } = useSyncExternalStore(
    pathStore.subscribe,
    pathStore.getSnapshot,
    pathStore.getServerSnapshot,
  );

  return (
    <AccessContextProvider organizationId={activeOrgId}>
      <Suspense fallback={null}>
        <ProtectedPathnameBridge store={pathStore} />
      </Suspense>
      <ProtectedShellInner
        user={user}
        pathname={pathname}
        activeOrgId={activeOrgId}
      >
        {children}
      </ProtectedShellInner>
    </AccessContextProvider>
  );
}
