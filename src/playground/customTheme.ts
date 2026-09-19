import { useSyncExternalStore } from "react";

/** Theme color keys the playground exposes for live editing. */
export type EditableColorKey = "accent" | "primary" | "secondary";

/**
 * The editable colors, in the order they appear in the design system. Editing
 * only these three is enough: `intelligentMerge` (see `components/Theme.tsx`)
 * derives `accent20`/`onAccent` from `accent` and every opacity variant from
 * `primary`/`secondary`, so the rest of the palette follows for free.
 */
export const EDITABLE_COLOR_KEYS: EditableColorKey[] = [
  "accent",
  "primary",
  "secondary",
];

/** Overrides map: only edited keys are present. Shape is a `Partial<Theme>`. */
export type ColorOverrides = Partial<Record<EditableColorKey, string>>;

const STORAGE_KEY = "lsCustomTheme";

/** Narrows an arbitrary string to one of the editable color keys. */
export const isEditableColorKey = (key: string): key is EditableColorKey =>
  (EDITABLE_COLOR_KEYS as string[]).includes(key);

const readStored = (): ColorOverrides => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== "object") {
      return {};
    }
    const result: ColorOverrides = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isEditableColorKey(key) && typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  } catch (_e) {
    return {};
  }
};

let overrides: ColorOverrides = readStored();
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
  getSnapshot: (): ColorOverrides => overrides,
  setColor: (key: EditableColorKey, value: string): void => {
    overrides = { ...overrides, [key]: value };
    persist();
    emit();
  },
  resetColor: (key: EditableColorKey): void => {
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
  restoreDefaults: (): void => {
    if (Object.keys(overrides).length === 0) {
      return;
    }
    overrides = {};
    persist();
    emit();
  },
};

/** Subscribes to the custom-theme overrides. Safe across React roots. */
export const useCustomTheme = (): ColorOverrides =>
  useSyncExternalStore(
    customThemeStore.subscribe,
    customThemeStore.getSnapshot,
  );
