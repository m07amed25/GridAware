export function getNextTheme(theme) {
  return theme === "dark" ? "light" : "dark";
}

export function getThemeTransitionRadius(
  centerX,
  centerY,
  viewportWidth,
  viewportHeight,
) {
  return Math.hypot(
    Math.max(centerX, viewportWidth - centerX),
    Math.max(centerY, viewportHeight - centerY),
  );
}
