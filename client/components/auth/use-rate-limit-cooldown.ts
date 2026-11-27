"use client";

import { useCallback, useEffect, useState } from "react";

export function useRateLimitCooldown() {
  const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const startCooldown = useCallback((seconds?: number) => {
    const safeSeconds =
      typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
        ? Math.ceil(seconds)
        : 60;
    const target = Date.now() + safeSeconds * 1000;
    setEndsAtMs(target);
    setRemainingSeconds(safeSeconds);
  }, []);

  const clearCooldown = useCallback(() => {
    setEndsAtMs(null);
    setRemainingSeconds(0);
  }, []);

  useEffect(() => {
    if (endsAtMs === null) {
      return;
    }

    const tick = () => {
      const diffMs = endsAtMs - Date.now();
      if (diffMs <= 0) {
        setEndsAtMs(null);
        setRemainingSeconds(0);
      } else {
        setRemainingSeconds(Math.ceil(diffMs / 1000));
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [endsAtMs]);

  return {
    remainingSeconds,
    isCoolingDown: remainingSeconds > 0,
    startCooldown,
    clearCooldown,
  };
}
