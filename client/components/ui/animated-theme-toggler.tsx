"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { getNextTheme, getThemeTransitionRadius } from "@/lib/theme.mjs";
import { cn } from "@/lib/utils";

type AnimatedThemeTogglerProps = {
  className?: string;
};

function subscribeToClient() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function AnimatedThemeToggler({
  className,
}: AnimatedThemeTogglerProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );

  const darkMode = mounted && resolvedTheme === "dark";
  const actionLabel = darkMode ? "Switch to light mode" : "Switch to dark mode";

  const onToggle = useCallback(() => {
    if (!buttonRef.current) return;

    const nextTheme = getNextTheme(darkMode ? "dark" : "light");
    const updateTheme = () => {
      flushSync(() => {
        setTheme(nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        document.documentElement.style.colorScheme = nextTheme;
      });
    };

    if (reduceMotion || !document.startViewTransition) {
      updateTheme();
      return;
    }

    const transition = document.startViewTransition(updateTheme);
    void transition.ready
      .then(() => {
        const button = buttonRef.current;
        if (!button) return;

        const { left, top, width, height } = button.getBoundingClientRect();
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const radius = getThemeTransitionRadius(
          centerX,
          centerY,
          window.innerWidth,
          window.innerHeight,
        );

        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${centerX}px ${centerY}px)`,
              `circle(${radius}px at ${centerX}px ${centerY}px)`,
            ],
          },
          {
            duration: 700,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => undefined);
  }, [darkMode, reduceMotion, setTheme]);

  const iconTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: "easeOut" as const };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      aria-label="Dark mode"
      aria-pressed={mounted ? darkMode : undefined}
      title={actionLabel}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[var(--border-default)] hover:bg-[var(--surface-3)] hover:text-[var(--text-strong)] active:scale-[0.96] active:bg-[var(--surface-4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] motion-reduce:transform-none motion-reduce:transition-none",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center"
      >
        {mounted ? (
          <AnimatePresence mode="wait" initial={false}>
            {darkMode ? (
              <motion.span
                key="sun-icon"
                initial={{ opacity: 0, scale: 0.55, rotate: 25 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0 }}
                transition={iconTransition}
                className="flex"
              >
                <Sun className="h-5 w-5" />
              </motion.span>
            ) : (
              <motion.span
                key="moon-icon"
                initial={{ opacity: 0, scale: 0.55, rotate: -25 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0 }}
                transition={iconTransition}
                className="flex"
              >
                <Moon className="h-5 w-5" />
              </motion.span>
            )}
          </AnimatePresence>
        ) : null}
      </span>
    </button>
  );
}
