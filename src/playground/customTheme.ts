import { useSyncExternalStore } from "react";

/** Theme color keys the playground exposes for live editing. */
export type EditableColorKey =
  "accent" | "background" | "primary" | "secondary";

/**
 * The editable colors, in the order they appear in the design system. Editing
 * only these four is enough: `intelligentMerge` (see `components/Theme.tsx`)
 * derives `accent50`/`accent20` from `accent` and every opacity variant from
 * `primary`/`secondary`, so the rest of the palette follows for free.
 * `background` stands alone — nothing is derived from it.
 */
export const EDITABLE_COLOR_KEYS: EditableColorKey[] = [
  "accent",
  "background",
  "primary",
  "secondary",
];

/**
 * Theme keys that are plain, non-color values: the font stack, the two corner
 * radii and the two stacking orders. They are edited as free text (they are
 * `string` in `Theme`, not numbers) in the design system's General entry.
 */
export type EditableGeneralKey =
  | "fontFamily"
  | "innerBorderRadius"
  | "outerBorderRadius"
  | "zIndexTouchpoint"
  | "zIndexLaunchButton";

/** The editable non-color values, in the order they appear in the UI. */
export const EDITABLE_GENERAL_KEYS: EditableGeneralKey[] = [
  "fontFamily",
  "innerBorderRadius",
  "outerBorderRadius",
  "zIndexTouchpoint",
  "zIndexLaunchButton",
];

/** Any theme field the playground exposes for live editing. */
export type EditableThemeKey = EditableColorKey | EditableGeneralKey;

/** Overrides map: only edited keys are present. Shape is a `Partial<Theme>`. */
export type ThemeOverrides = Partial<Record<EditableThemeKey, string>>;

const STORAGE_KEY = "lsCustomTheme";

/** Narrows an arbitrary string to one of the editable color keys. */
export const isEditableColorKey = (key: string): key is EditableColorKey =>
  (EDITABLE_COLOR_KEYS as string[]).includes(key);

/** Narrows an arbitrary string to one of the editable theme fields. */
export const isEditableThemeKey = (key: string): key is EditableThemeKey =>
  isEditableColorKey(key) || (EDITABLE_GENERAL_KEYS as string[]).includes(key);

const readStored = (): ThemeOverrides => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== "object") {
      return {};
    }
    const result: ThemeOverrides = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isEditableThemeKey(key) && typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  } catch (_e) {
    return {};
  }
};

let overrides: ThemeOverrides = readStored();
const listeners = new Set<() => void>();

const persist = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (_e) {
    /* localStorage unavailable */
  }
};

const emit = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/**
 * Module-level store for the playground's custom theme. It lives outside React
 * (rather than in a context) because the design-system specimens render in
 * their own React root inside a shadow DOM — a context can't cross that
 * boundary, but a singleton subscribed to via `useSyncExternalStore` can. The
 * overrides are persisted to local storage and restored on load.
 */
export const customThemeStore = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): ThemeOverrides => overrides,
  /** Overrides one theme field, color or otherwise. */
  setField: (key: EditableThemeKey, value: string): void => {
    overrides = { ...overrides, [key]: value };
    persist();
    emit();
  },
  /** Drops one override, so the library's default applies again. */
  resetField: (key: EditableThemeKey): void => {
    if (!(key in overrides)) {
      return;
    }
    // Rebuild without the key rather than `delete` (which lint disallows on a
    // dynamically computed key).
    overrides = Object.fromEntries(
      Object.entries(overrides).filter(([existing]) => existing !== key),
    );
    persist();
    emit();
  },
  /**
   * Drops a group of overrides at once, for the "restore defaults" buttons:
   * each gallery resets only the fields it edits.
   */
  restoreDefaults: (keys: EditableThemeKey[]): void => {
    if (!keys.some((key) => key in overrides)) {
      return;
    }
    overrides = Object.fromEntries(
      Object.entries(overrides).filter(
        ([existing]) => !(keys as string[]).includes(existing),
      ),
    );
    persist();
    emit();
  },
};

/** Subscribes to the custom-theme overrides. Safe across React roots. */
export const useCustomTheme = (): ThemeOverrides =>
  useSyncExternalStore(
    customThemeStore.subscribe,
    customThemeStore.getSnapshot,
  );
