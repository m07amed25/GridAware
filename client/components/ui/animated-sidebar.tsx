"use client";

import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChevronsLeft, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface AnimatedSidebarItem {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string;
}

export interface AnimatedSidebarGroup {
  label: string;
  items: AnimatedSidebarItem[];
}

export interface AnimatedSidebarAccount {
  id?: string;
  name: string;
  detail: string;
  initials: string;
  href: string;
}

export interface AnimatedSidebarProps {
  groups: AnimatedSidebarGroup[];
  activeId?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onItemClick?: (item: AnimatedSidebarItem) => void;
  brand?: ReactNode;
  collapsedBrand?: ReactNode;
  brandHref?: string;
  brandLabel?: string;
  account?: AnimatedSidebarAccount;
  hideCollapseButton?: boolean;
  onClose?: () => void;
  ariaLabel?: string;
  className?: string;
}

function SidebarTooltip({
  enabled,
  label,
  children,
}: {
  enabled: boolean;
  label: string;
  children: ReactNode;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

const emptySubscribe = () => () => {};

function getShortcutLabel() {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "⌘B" : "Ctrl+B";
}

function getServerShortcutLabel() {
  return "Ctrl+B";
}

export function AnimatedSidebar({
  groups,
  activeId,
  expanded: controlledExpanded,
  defaultExpanded = true,
  onExpandedChange,
  onItemClick,
  brand,
  collapsedBrand,
  brandHref = "/app",
  brandLabel = "GridAware Dashboard",
  account,
  hideCollapseButton = false,
  onClose,
  ariaLabel = "Main navigation",
  className,
}: AnimatedSidebarProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded);
  const shortcutLabel = useSyncExternalStore(
    emptySubscribe,
    getShortcutLabel,
    getServerShortcutLabel,
  );
  const open = controlledExpanded ?? uncontrolledExpanded;

  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const hasPositionedRef = useRef(false);

  const toggleExpanded = useCallback(() => {
    const next = !open;
    if (controlledExpanded === undefined) {
      setUncontrolledExpanded(next);
    }
    onExpandedChange?.(next);
  }, [controlledExpanded, onExpandedChange, open]);

  useEffect(() => {
    if (hideCollapseButton) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.shiftKey ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "b"
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      toggleExpanded();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hideCollapseButton, toggleExpanded]);

  useLayoutEffect(() => {
    const listEl = listRef.current;
    const indicatorEl = indicatorRef.current;
    if (!listEl || !indicatorEl) {
      return;
    }

    const syncIndicator = (immediate: boolean) => {
      const activeEl = listEl.querySelector<HTMLElement>(
        '[data-active="true"]',
      );

      if (!activeEl) {
        indicatorEl.style.opacity = "0";
        hasPositionedRef.current = false;
        return;
      }

      const listRect = listEl.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const top = activeRect.top - listRect.top + listEl.scrollTop;
      const height = activeEl.offsetHeight;

      if (immediate || !hasPositionedRef.current) {
        indicatorEl.style.transitionDuration = "0ms";
        indicatorEl.style.height = `${height}px`;
        indicatorEl.style.transform = `translateY(${top}px)`;
        indicatorEl.style.opacity = "1";
        void indicatorEl.offsetHeight;
        indicatorEl.style.transitionDuration = "";
        hasPositionedRef.current = true;
      } else {
        indicatorEl.style.height = `${height}px`;
        indicatorEl.style.transform = `translateY(${top}px)`;
        indicatorEl.style.opacity = "1";
      }
    };

    syncIndicator(false);

    const observer = new ResizeObserver(() => {
      syncIndicator(true);
    });
    observer.observe(listEl);

    return () => {
      observer.disconnect();
    };
  }, [activeId, open, groups]);

  const isAccountActive =
    account?.id !== undefined && account.id === activeId;

  return (
    <TooltipProvider delayDuration={180}>
      <nav
        aria-label={ariaLabel}
        data-expanded={open}
        className={cn(
          "relative flex h-full shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-primary)] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "w-[248px]" : "w-[72px]",
          className,
        )}
      >
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-subtle)]">
          <Link
            href={brandHref}
            aria-label={brandLabel}
            onClick={() => {
              if (onClose) onClose();
            }}
            className={cn(
              "relative flex h-full min-w-0 flex-1 items-center overflow-hidden rounded-[var(--radius-sm)] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)]",
              open ? "px-5" : "justify-center px-0",
            )}
          >
            {open ? (
              <span className="flex items-center whitespace-nowrap transition-opacity duration-200 delay-75">
                {brand}
              </span>
            ) : (
              <span className="flex items-center justify-center">
                {collapsedBrand ?? brand}
              </span>
            )}
          </Link>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="me-3 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            >
              <X className="size-[18px]" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div
          ref={listRef}
          className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-3"
        >
          <span
            ref={indicatorRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-0 z-0 h-11 rounded-[var(--radius-md)] bg-[var(--surface-3)] opacity-0 ring-1 ring-[var(--border-default)] transition-[transform,opacity,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          >
            <span className="absolute inset-y-2.5 start-0 w-[3px] rounded-e-full bg-[var(--color-yellow)]" />
          </span>

          <div className="relative z-10 space-y-4">
            {groups
              .filter((group) => group.items.length > 0)
              .map((group, groupIndex) => (
                <div key={group.label}>
                  {open ? (
                    <p
                      id={`sidebar-group-${groupIndex}`}
                      className="mb-1.5 truncate px-[15px] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]"
                    >
                      {group.label}
                    </p>
                  ) : groupIndex > 0 ? (
                    <div
                      aria-hidden="true"
                      className="mx-2 my-2.5 h-px bg-[var(--border-subtle)]"
                    />
                  ) : null}

                  <ul
                    aria-label={group.label}
                    className="space-y-1"
                  >
                    {group.items.map((item) => {
                      const active = item.id === activeId;
                      return (
                        <li key={item.id}>
                          <SidebarTooltip enabled={!open} label={item.label}>
                            <Link
                              href={item.href}
                              data-active={active ? "true" : undefined}
                              aria-label={open ? undefined : item.label}
                              aria-current={active ? "page" : undefined}
                              onClick={() => onItemClick?.(item)}
                              className={cn(
                                "relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-[var(--radius-md)] px-[15px] text-[13px] leading-5 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)]",
                                active
                                  ? "font-semibold text-[var(--text-strong)]"
                                  : "font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-strong)]",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-[18px] shrink-0 items-center justify-center [&>svg]:size-[18px] [&>svg]:stroke-[1.8]",
                                  active
                                    ? "text-[var(--color-yellow)]"
                                    : "text-[var(--text-muted)]",
                                )}
                                aria-hidden="true"
                              >
                                {item.icon}
                              </span>
                              <span
                                className={cn(
                                  "truncate whitespace-nowrap transition-opacity duration-200",
                                  open
                                    ? "opacity-100 delay-100"
                                    : "pointer-events-none opacity-0",
                                )}
                              >
                                {item.label}
                              </span>
                              {open && item.badge ? (
                                <span className="ms-auto shrink-0 rounded-full bg-[var(--surface-4)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--text-primary)]">
                                  {item.badge}
                                </span>
                              ) : null}
                            </Link>
                          </SidebarTooltip>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 border-t border-[var(--border-subtle)] p-3",
            open
              ? "flex items-center gap-1.5"
              : "flex flex-col items-center gap-2",
            !account && open && "justify-end",
          )}
        >
          {account ? (
            <SidebarTooltip
              enabled={!open}
              label={`${account.name} (${account.detail})`}
            >
              <Link
                href={account.href}
                aria-label={open ? undefined : account.name}
                aria-current={isAccountActive ? "page" : undefined}
                onClick={() => {
                  if (account.id && onItemClick) {
                    onItemClick({
                      id: account.id,
                      label: account.name,
                      href: account.href,
                      icon: null,
                    });
                  }
                }}
                className={cn(
                  "relative flex h-12 items-center gap-2.5 overflow-hidden rounded-[var(--radius-md)] px-2 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus-ring)]",
                  open ? "min-w-0 flex-1" : "w-full justify-center",
                  isAccountActive
                    ? "bg-[var(--surface-3)] ring-1 ring-[var(--border-default)]"
                    : "hover:bg-[var(--surface-2)]",
                )}
              >
                {isAccountActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2.5 start-0 w-[3px] rounded-e-full bg-[var(--color-yellow)]"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-2)] text-[11px] font-semibold text-[var(--color-yellow)]"
                >
                  {account.initials}
                </span>
                {open ? (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium leading-4 text-[var(--text-strong)]">
                      {account.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] leading-4 text-[var(--text-muted)]">
                      {account.detail}
                    </span>
                  </span>
                ) : null}
              </Link>
            </SidebarTooltip>
          ) : null}

          {!hideCollapseButton ? (
            <SidebarTooltip
              enabled
              label={
                open
                  ? `Collapse sidebar (${shortcutLabel})`
                  : `Expand sidebar (${shortcutLabel})`
              }
            >
              <button
                type="button"
                onClick={toggleExpanded}
                aria-expanded={open}
                aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                aria-keyshortcuts="Control+B Meta+B"
                className="group inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/70 text-[var(--text-muted)] outline-none transition-[background-color,border-color,color,transform] duration-200 hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] hover:text-[var(--color-yellow)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <ChevronsLeft
                  aria-hidden="true"
                  className={cn(
                    "size-4 stroke-[1.9] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    open
                      ? "group-hover:-translate-x-0.5"
                      : "rotate-180 group-hover:translate-x-0.5",
                  )}
                />
              </button>
            </SidebarTooltip>
          ) : null}
        </div>
      </nav>
    </TooltipProvider>
  );
}
