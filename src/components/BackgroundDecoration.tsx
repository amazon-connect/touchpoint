/* eslint-disable jsdoc/require-jsdoc */
import { type FC } from "react";
import { clsx } from "clsx";
import { useProvidedThemeFields } from "./Theme";

/**
 * Decorative depth layer for the main surface.
 *
 * Touchpoint's background is translucent and backdrop-blurred, so over a real
 * website it picks up depth from the page beneath it. Over a blank page there
 * is nothing to blur, so the surface reads as flat. This layer adds that depth
 * on its own with a set of soft radial glows (see `.touchpoint-bg-decoration`).
 *
 * It renders behind all content (`-z-10`) but above the translucent background
 * fill, and adapts to light/dark automatically via `light-dark()`. Purely
 * presentational — hidden from assistive tech.
 */
export const BackgroundDecoration: FC = () => {
  const providedThemeFields = useProvidedThemeFields();
  const hasExplicitBackground = providedThemeFields.includes("background");

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "absolute inset-0 -z-10 overflow-hidden pointer-events-none",
        hasExplicitBackground
          ? "bg-background backdrop-blur-overlay"
          : "touchpoint-bg-decoration",
      )}
    />
  );
};
