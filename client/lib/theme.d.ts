export type Theme = "light" | "dark";

export function getNextTheme(theme: Theme): Theme;

export function getThemeTransitionRadius(
  centerX: number,
  centerY: number,
  viewportWidth: number,
  viewportHeight: number,
): number;
