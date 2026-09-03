import { useCallback, useEffect, useState } from "react";

/** Page theme of the playground itself (not the Touchpoint widget). */
export type PageTheme = "light" | "dark";

const STORAGE_KEY = "lsTheme";

const readStoredTheme = (): PageTheme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch (_e) {
    /* localStorage unavailable */
  }
  return "dark";
};

/**
 * Page theme state, mirrored onto `<html data-theme>` (which the palette in
 * `playground.css` keys off) and persisted to local storage. `index.html` reads
 * the same key before first paint to avoid a flash of the wrong palette.
 */
export const useTheme = (): [PageTheme, (theme: PageTheme) => void] => {
  const [theme, setTheme] = useState<PageTheme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_e) {
      /* localStorage unavailable */
    }
  }, [theme]);

  return [theme, useCallback((next: PageTheme) => setTheme(next), [])];
};
