/* eslint-disable jsdoc/require-jsdoc */
import { createContext, type CSSProperties, useContext } from "react";

import { type Theme } from "../interface";

export type ThemeField = keyof Theme;

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
    "--color-background": theme.background,
    "--color-overlay": theme.overlay,

    "--color-warning-primary": theme.warningPrimary,
    "--color-warning-secondary": theme.warningSecondary,
    "--color-error-primary": theme.errorPrimary,
    "--color-error-secondary": theme.errorSecondary,
    "--color-success-primary": theme.successPrimary,
    "--color-success-secondary": theme.successSecondary,
    "--color-focus": theme.focus,
  } as CSSProperties;
};

export const defaultTheme: Theme = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  innerBorderRadius: "20px",
  outerBorderRadius: "28px",

  primary: "light-dark(rgb(0, 2, 9), rgb(255, 255, 255))",
  primary90: "light-dark(rgba(0, 0, 0, 0.9), rgba(255, 255, 255, 0.95))",
  primary80: "light-dark(rgba(0, 2, 9, 0.8), rgba(255, 255, 255, 0.85))",
  primary60: "light-dark(rgba(0, 0, 0, 0.6), rgba(255, 255, 255, 0.65))",
  primary40: "light-dark(rgba(0, 0, 0, 0.4), rgba(255, 255, 255, 0.45))",
  primary20: "light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.25))",
  primary10: "light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.12))",
  primary5: "light-dark(rgba(0, 0, 0, 0.03), rgba(255, 255, 255, 0.03))",
  primary1: "light-dark(rgba(0, 0, 0, 0.01), rgba(255, 255, 255, 0.01))",

  secondary: "light-dark(rgb(255, 255, 255), rgb(0, 2, 9))",
  secondary90: "light-dark(rgba(255, 255, 255, 0.95), rgba(0, 0, 0, 0.9))",
  secondary80: "light-dark(rgba(255, 255, 255, 0.85), rgba(0, 2, 9, 0.8))",
  secondary60: "light-dark(rgba(255, 255, 255, 0.65), rgba(0, 0, 0, 0.6))",
  secondary40: "light-dark(rgba(255, 255, 255, 0.45), rgba(0, 0, 0, 0.4))",
  secondary20: "light-dark(rgba(255, 255, 255, 0.25), rgba(0, 0, 0, 0.2))",
  secondary10: "light-dark(rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.1))",
  secondary5: "light-dark(rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.03))",
  secondary1: "light-dark(rgba(255, 255, 255, 0.01), rgba(0, 0, 0, 0.01))",

  // Accent defaults to black/white (matching primary) so that it stays
  // understated out of the box, and setting a brand accent is clearly visible.
  accent: "light-dark(rgba(0, 0, 0, 1), rgba(255, 255, 255, 1))",
  accent20: "light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.25))",
  // Base surface fill (per Figma): light #F2F2F2 @ 90%, dark #1B1B21 @ 95%.
  background: "light-dark(rgba(242, 242, 242, 0.9), rgba(27, 27, 33, 0.95))",
  overlay: "light-dark(rgba(0, 2, 9, 0.4), rgba(0, 0, 0, 0.4))",

  warningPrimary: "light-dark(rgb(220, 159, 3), rgb(255, 214, 108))",
  warningSecondary: "light-dark(rgb(255, 217, 118), rgb(131, 94, 0))",
  errorPrimary: "light-dark(rgb(157, 3, 3), rgb(255, 58, 105))",
  errorSecondary: "light-dark(rgb(255, 92, 137), rgb(157, 3, 3))",
  successPrimary: "light-dark(rgb(11, 120, 70), rgb(136, 214, 79))",
  successSecondary: "light-dark(rgb(157, 215, 115), rgb(11, 120, 70))",
  focus: "light-dark(rgba(0, 127, 217, 0.9), rgba(0, 149, 255, 0.7))",
};

export const intelligentMerge = (theme: Partial<Theme>): Theme => {
  const computed: Partial<Theme> = {};

  if (theme.accent != null && theme.accent20 == null) {
    computed.accent20 = `color-mix(in srgb, ${theme.accent} 20%, transparent)`;
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
    ...defaultTheme,
    ...computed,
    ...theme,
  };
};

// Which theme fields the consumer set explicitly, as opposed to the ones filled
// in by `defaultTheme` or derived by `intelligentMerge`. Components use this to
// decide whether a field carries brand intent (e.g. an accent worth showing off)
// or is just the understated default.
const ProvidedThemeFieldsContext = createContext<readonly ThemeField[]>([]);

export const ProvidedThemeFieldsProvider = ProvidedThemeFieldsContext.Provider;

export const useProvidedThemeFields = (): readonly ThemeField[] =>
  useContext(ProvidedThemeFieldsContext);
