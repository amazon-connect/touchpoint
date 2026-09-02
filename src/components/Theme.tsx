/* eslint-disable jsdoc/require-jsdoc */
import { type CSSProperties } from "react";

import { type Theme } from "../interface";

export const toCustomProperties = (theme: Theme): CSSProperties => {
  return {
    "--font-family": theme.fontFamily,
    "--radius-inner": theme.innerBorderRadius,
    "--radius-outer": theme.outerBorderRadius,

    "--color-primary": theme.primary,
    "--color-primary-90": theme.primary90,
    "--color-primary-80": theme.primary80,
    "--color-primary-60": theme.primary60,
    "--color-primary-40": theme.primary40,
    "--color-primary-20": theme.primary20,
    "--color-primary-10": theme.primary10,
    "--color-primary-5": theme.primary5,
    "--color-primary-1": theme.primary1,

    "--color-secondary": theme.secondary,
    "--color-secondary-90": theme.secondary90,
    "--color-secondary-80": theme.secondary80,
    "--color-secondary-60": theme.secondary60,
    "--color-secondary-40": theme.secondary40,
    "--color-secondary-20": theme.secondary20,
    "--color-secondary-10": theme.secondary10,
    "--color-secondary-5": theme.secondary5,
    "--color-secondary-1": theme.secondary1,

    "--color-accent": theme.accent,
    "--color-accent-20": theme.accent20,
    "--color-on-accent": theme.onAccent,
    "--color-background": theme.background,
    "--color-overlay": theme.overlay,

    "--color-warning-primary": theme.warningPrimary,
    "--color-warning-secondary": theme.warningSecondary,
    "--color-error-primary": theme.errorPrimary,
    "--color-error-secondary": theme.errorSecondary,
  } as CSSProperties;
};

const customProperties: Theme = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  innerBorderRadius: "20px",
  outerBorderRadius: "28px",

  primary: "light-dark(rgb(0, 2, 9), rgb(255, 255, 255))",
  primary90: "light-dark(rgba(0, 2, 9, 0.9), rgba(255, 255, 255, 0.95))",
  primary80: "light-dark(rgba(0, 2, 9, 0.8), rgba(255, 255, 255, 0.85))",
  primary60: "light-dark(rgba(0, 2, 9, 0.6), rgba(255, 255, 255, 0.65))",
  primary40: "light-dark(rgba(0, 2, 9, 0.4), rgba(255, 255, 255, 0.45))",
  primary20: "light-dark(rgba(0, 2, 9, 0.2), rgba(255, 255, 255, 0.25))",
  primary10: "light-dark(rgba(0, 2, 9, 0.1), rgba(255, 255, 255, 0.15))",
  primary5: "light-dark(rgba(0, 2, 9, 0.05), rgba(255, 255, 255, 0.08))",
  primary1: "light-dark(rgba(0, 2, 9, 0.01), rgba(255, 255, 255, 0.01))",

  secondary: "light-dark(rgb(255, 255, 255), rgb(0, 2, 9))",
  secondary90: "light-dark(rgba(255, 255, 255, 0.9), rgba(0, 2, 9, 0.95))",
  secondary80: "light-dark(rgba(255, 255, 255, 0.85), rgba(0, 2, 9, 0.8))",
  secondary60: "light-dark(rgba(255, 255, 255, 0.65), rgba(0, 2, 9, 0.6))",
  secondary40: "light-dark(rgba(255, 255, 255, 0.45), rgba(0, 2, 9, 0.4))",
  secondary20: "light-dark(rgba(255, 255, 255, 0.25), rgba(0, 2, 9, 0.2))",
  secondary10: "light-dark(rgba(255, 255, 255, 0.15), rgba(0, 2, 9, 0.1))",
  secondary5: "light-dark(rgba(255, 255, 255, 0.08), rgba(0, 2, 9, 0.05))",
  secondary1: "light-dark(rgba(255, 255, 255, 0.01), rgba(0, 2, 9, 0.01))",

  // Accent defaults to black/white (matching primary) so that it stays
  // understated out of the box, and setting a brand accent is clearly visible.
  accent: "light-dark(rgb(0, 2, 9), rgb(255, 255, 255))",
  accent20: "light-dark(rgba(0, 2, 9, 0.2), rgba(255, 255, 255, 0.25))",
  // The contrasting foreground on the default black/white accent (i.e. secondary).
  onAccent: "light-dark(rgb(255, 255, 255), rgb(0, 2, 9))",
  // Base surface fill (per Figma): light #DCDCDC @ 90%, dark #121215 @ 95%.
  background: "light-dark(rgba(220, 220, 220, 0.9), rgba(18, 18, 21, 0.95))",
  overlay: "rgba(0, 2, 9, 0.4)",

  warningPrimary: "light-dark(rgb(220, 159, 3), rgb(255, 214, 108))",
  warningSecondary: "light-dark(rgb(255, 242, 209), rgb(95, 65, 29))",
  errorPrimary: "light-dark(rgb(157, 3, 3), rgb(255, 133, 162))",
  errorSecondary: "light-dark(rgb(255, 223, 230), rgb(94, 4, 4))",
};

/**
 * Parses a solid CSS color (hex or rgb/rgba) into `[r, g, b]`. Returns null for
 * anything mode-dependent or otherwise unresolvable (e.g. `light-dark(...)`,
 * `var(...)`, named colors), where a single foreground can't be derived.
 */
const parseRgb = (color: string): [number, number, number] | null => {
  const value = color.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (hex != null) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb != null) {
    const parts = rgb[1]
      .split(/[,/\s]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      return [parts[0], parts[1], parts[2]];
    }
  }
  return null;
};

/**
 * Derives a legible foreground color for content on top of `accent`. Colored
 * accents keep a light foreground for a branded look; only near-white accents
 * flip to dark. Falls back to secondary (light/dark) when the accent isn't a
 * resolvable solid color.
 */
const deriveOnAccent = (accent: string): string => {
  const rgb = parseRgb(accent);
  if (rgb == null) {
    return "light-dark(rgb(255, 255, 255), rgb(0, 2, 9))";
  }
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.82 ? "rgb(0, 2, 9)" : "rgb(255, 255, 255)";
};

export const intelligentMerge = (theme: Partial<Theme>): Theme => {
  const computed: Partial<Theme> = {};

  if (theme.accent != null && theme.accent20 == null) {
    computed.accent20 = `color-mix(in srgb, ${theme.accent} 20%, transparent)`;
  }

  if (theme.accent != null && theme.onAccent == null) {
    computed.onAccent = deriveOnAccent(theme.accent);
  }

  if (theme.primary != null) {
    if (theme.primary90 == null)
      computed.primary90 = `rgb(from ${theme.primary} r g b / 0.9)`;
    if (theme.primary80 == null)
      computed.primary80 = `rgb(from ${theme.primary} r g b / 0.8)`;

    if (theme.primary60 == null)
      computed.primary60 = `rgb(from ${theme.primary} r g b / 0.6)`;
    if (theme.primary40 == null)
      computed.primary40 = `rgb(from ${theme.primary} r g b / 0.4)`;
    if (theme.primary20 == null)
      computed.primary20 = `rgb(from ${theme.primary} r g b / 0.2)`;
    if (theme.primary10 == null)
      computed.primary10 = `rgb(from ${theme.primary} r g b / 0.1)`;
    if (theme.primary5 == null)
      computed.primary5 = `rgb(from ${theme.primary} r g b / 0.05)`;
    if (theme.primary1 == null)
      computed.primary1 = `rgb(from ${theme.primary} r g b / 0.01)`;
  }

  if (theme.secondary != null) {
    if (theme.secondary90 == null)
      computed.secondary90 = `rgb(from ${theme.secondary} r g b / 0.9)`;
    if (theme.secondary80 == null)
      computed.secondary80 = `rgb(from ${theme.secondary} r g b / 0.8)`;
    if (theme.secondary60 == null)
      computed.secondary60 = `rgb(from ${theme.secondary} r g b / 0.6)`;
    if (theme.secondary40 == null)
      computed.secondary40 = `rgb(from ${theme.secondary} r g b / 0.4)`;
    if (theme.secondary20 == null)
      computed.secondary20 = `rgb(from ${theme.secondary} r g b / 0.2)`;
    if (theme.secondary10 == null)
      computed.secondary10 = `rgb(from ${theme.secondary} r g b / 0.1)`;
    if (theme.secondary5 == null)
      computed.secondary5 = `rgb(from ${theme.secondary} r g b / 0.05)`;
    if (theme.secondary1 == null)
      computed.secondary1 = `rgb(from ${theme.secondary} r g b / 0.01)`;
  }
  return {
    ...customProperties,
    ...computed,
    ...theme,
  };
};
