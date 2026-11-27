/**
 * Deterministically summarizes a raw User-Agent header into human-readable
 * browser, operating system, and device category metadata with safe fallbacks.
 * @param {string | null | undefined} userAgent
 */
export function parseSessionClient(userAgent) {
  const raw = typeof userAgent === "string" && userAgent.trim() ? userAgent.trim() : null;
  if (!raw) {
    return {
      browser: "Unknown browser",
      os: null,
      deviceType: "unknown",
      summary: "Unknown browser or client",
      raw: null,
    };
  }

  const ua = raw;

  // Automated / CLI clients
  if (/^(curl|wget|httpie|postmanruntime|insomnia|node|undici|python-requests)\b/i.test(ua)) {
    const toolName = ua.split(/[\s/]/)[0];
    return {
      browser: `${toolName} client`,
      os: null,
      deviceType: "unknown",
      summary: `${toolName} (CLI / API client)`,
      raw,
    };
  }

  // Operating System detection (order matters: iOS before macOS, Android before Linux)
  let os = null;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = "iOS";
  } else if (/Android/i.test(ua)) {
    os = "Android";
  } else if (/Windows NT|Win64|WOW64/i.test(ua)) {
    os = "Windows";
  } else if (/CrOS/i.test(ua)) {
    os = "ChromeOS";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
  } else if (/Linux|X11/i.test(ua)) {
    os = "Linux";
  }

  // Device category detection
  let deviceType = "unknown";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = "tablet";
  } else if (/iPhone|iPod|Mobile|Windows Phone/i.test(ua)) {
    deviceType = "mobile";
  } else if (os === "Windows" || os === "macOS" || os === "Linux" || os === "ChromeOS") {
    deviceType = "desktop";
  }

  // Browser detection (most specific tokens first)
  let browser = "Unknown browser";
  if (/EdgA?\/|EdgiOS\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/Brave/i.test(ua)) {
    browser = "Brave";
  } else if (/Firefox\/|FxiOS\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Chrome\/|CriOS\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Safari\//i.test(ua)) {
    browser = os === "iOS" ? "Mobile Safari" : "Safari";
  }

  if (browser === "Unknown browser" && !os) {
    return {
      browser,
      os: null,
      deviceType: "unknown",
      summary: "Unknown browser or client",
      raw,
    };
  }

  const summary = os ? `${browser} on ${os}` : browser;
  return {
    browser,
    os,
    deviceType,
    summary,
    raw,
  };
}
