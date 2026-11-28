import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getNextTheme, getThemeTransitionRadius } from "./theme.mjs";

const globalsCss = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const rootTokens = /:root\s*\{([\s\S]*?)\n\}/.exec(globalsCss)?.[1] ?? "";

function token(name) {
  const value = new RegExp(`${name}:\\s*([^;]+);`).exec(rootTokens)?.[1];
  assert.ok(value, `Missing light-theme token ${name}`);
  return value;
}

function channels(color) {
  if (Array.isArray(color)) return color;
  if (color.startsWith("#")) {
    return color.slice(1).match(/../g).map((value) => parseInt(value, 16));
  }
  const values = /rgba\(([^)]+)\)/.exec(color)?.[1];
  assert.ok(values, `Unsupported token color ${color}`);
  return values.split(",").map(Number);
}

function luminance(color) {
  const linear = channels(color)
    .slice(0, 3)
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function composite(foreground, background) {
  const [red, green, blue, alpha] = channels(foreground);
  const backgroundChannels = channels(background);
  return [red, green, blue].map((value, index) =>
    Math.round(value * alpha + backgroundChannels[index] * (1 - alpha)),
  );
}

test("getNextTheme switches between light and dark", () => {
  assert.equal(getNextTheme("light"), "dark");
  assert.equal(getNextTheme("dark"), "light");
});

test("getThemeTransitionRadius reaches the farthest viewport corner", () => {
  const radius = getThemeTransitionRadius(100, 50, 1000, 800);

  assert.ok(Math.abs(radius - 1171.5374513859983) < 0.000001);
});

test("light control borders meet 3:1 contrast on app surfaces", () => {
  for (const borderName of ["--border-default", "--border-strong"]) {
    const border = token(borderName);
    for (const surfaceName of [
      "--surface-canvas",
      "--surface-1",
      "--surface-2",
    ]) {
      assert.ok(
        contrast(border, token(surfaceName)) >= 3,
        `${borderName} must meet 3:1 on ${surfaceName}`,
      );
    }
  }
});

test("light success text meets 4.5:1 contrast on tinted surfaces", () => {
  const success = token("--status-success");
  const successBackground = token("--status-success-bg");

  for (const surfaceName of ["--surface-canvas", "--surface-1", "--surface-2"]) {
    const tintedBackground = composite(successBackground, token(surfaceName));
    assert.ok(
      contrast(success, tintedBackground) >= 4.5,
      `--status-success must meet 4.5:1 on tinted ${surfaceName}`,
    );
  }
});
