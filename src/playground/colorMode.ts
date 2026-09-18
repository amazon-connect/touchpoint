import { useCallback, useEffect, useState } from "react";
import { type ColorMode } from "../interface";

const STORAGE_KEY = "lsColorMode";

/**
 * Reads the playground page's stored color mode. Only `light`/`dark` are
 * offered — the playground UI has no `light dark` option.
 */
const readStoredColorMode = (): ColorMode => {
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
 * Page color mode state, mirrored onto `<html data-color-mode>` (which the
 * palette in `playground.css` keys off) and persisted to local storage.
 * `index.html` reads the same key before first paint to avoid a flash of the
 * wrong palette.
 */
export const useColorMode = (): [ColorMode, (mode: ColorMode) => void] => {
  const [colorMode, setColorMode] = useState<ColorMode>(readStoredColorMode);

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
    try {
      localStorage.setItem(STORAGE_KEY, colorMode);
    } catch (_e) {
      /* localStorage unavailable */
    }
  }, [colorMode]);

  return [colorMode, useCallback((next: ColorMode) => setColorMode(next), [])];
};
