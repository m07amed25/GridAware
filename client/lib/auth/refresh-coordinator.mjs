/**
 * Serializes concurrent 401 refresh attempts across tabs via Web Locks API
 * (`navigator.locks.request('gridaware:auth:refresh')`) with an in-memory
 * singleton Promise fallback when Web Locks is unavailable.
 */
export function createRefreshCoordinator({ executeRefresh, broadcast }) {
  let inflightPromise = null;

  async function runRefresh() {
    const ok = await executeRefresh();
    if (typeof broadcast === "function") {
      broadcast({
        type: ok ? "SESSION_REFRESHED" : "SESSION_INVALIDATED",
      });
    }
    return ok;
  }

  async function refreshOnce() {
    if (inflightPromise) {
      return inflightPromise;
    }

    const work = (async () => {
      if (
        typeof navigator !== "undefined" &&
        navigator.locks &&
        typeof navigator.locks.request === "function"
      ) {
        return navigator.locks.request(
          "gridaware:auth:refresh",
          { mode: "exclusive" },
          () => runRefresh(),
        );
      }
      return runRefresh();
    })();

    inflightPromise = work;
    try {
      return await work;
    } finally {
      inflightPromise = null;
    }
  }

  return { refreshOnce };
}
