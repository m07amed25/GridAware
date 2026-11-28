export type ShellNavIconKey =
  | "workspace-overview"
  | "onboarding"
  | "org-overview"
  | "org-sites"
  | "org-devices"
  | "org-sensors"
  | "org-members"
  | "org-roles"
  | "org-settings";

export interface ShellNavItemDescriptor {
  id: string;
  label: string;
  href: string;
  iconKey: ShellNavIconKey;
}

export interface ShellNavGroupDescriptor {
  label: string;
  items: ShellNavItemDescriptor[];
}

export function extractActiveOrgId(pathname: string): string | null;

export interface ShellPathSnapshot {
  pathname: string;
  activeOrgId: string | null;
}

export interface ShellPathStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): ShellPathSnapshot;
  getServerSnapshot(): ShellPathSnapshot;
  setPathname(pathname: string): void;
}

export function createShellPathStore(): ShellPathStore;

export function resolveActiveSidebarId(
  pathname: string,
  activeOrgId: string | null,
): string | undefined;

export function buildShellNavGroups(params: {
  activeOrgId: string | null;
  activeOrgName?: string | null;
  permissions: ReadonlySet<string> | null;
}): ShellNavGroupDescriptor[];

export function getUserInitials(name: string): string;
