import { type FC } from "react";
import { clsx } from "clsx";
import { useProvidedThemeFields } from "./Theme";

// Each layer covers the surface and sits behind all content. They are siblings
// inside `Main` rather than children of a shared wrapper because a wrapper with
// `-z-10` would be a stacking context, which isolates `mix-blend-mode` from the
// background fill the sheen needs to blend with.
const Layer: FC<{ className: string }> = ({ className }) => (
  <div
    aria-hidden="true"
    className={clsx("absolute inset-0 -z-10 pointer-events-none", className)}
  />
);

/**
 * Decorative depth layers for the main surface.
 *
 * Touchpoint's background is translucent and backdrop-blurred, so over a real
 * website it picks up depth from the page beneath it. Over a blank page there
 * is nothing to blur, so the surface reads as flat. These layers add that depth
 * on their own: a tinted glow, a diagonal sheen, a shade along the bottom and a
 * film of grain (see `.touchpoint-bg-*` in `index.css`).
 *
 * They render behind all content (`-z-10`) but above the translucent background
 * fill, and adapt to light/dark automatically via `light-dark()`. Purely
 * presentational — hidden from assistive tech.
 *
 * Overlay layouts (`half` / `full` / `floating`) cover the page, so they get a
 * plain reinforced fill instead: there the depth would compete with the page
 * showing around the surface.
 */
export const BackgroundDecoration: FC<{
  backgroundDepthLayer: boolean;
}> = ({ backgroundDepthLayer }) => {
  const hasExplicitBackground = useProvidedThemeFields().includes("background");
  return (
    <>
      <Layer className="bg-background backdrop-blur-overlay" />
      {hasExplicitBackground ? null : <Layer className="touchpoint-bg-wash" />}
      {backgroundDepthLayer ? (
        <>
          <Layer className="touchpoint-bg-sheen" />
          <Layer className="touchpoint-bg-shade" />
          <Layer className="touchpoint-bg-grain" />
        </>
      ) : null}
    </>
  );
};
