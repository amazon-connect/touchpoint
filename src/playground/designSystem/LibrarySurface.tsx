import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ColorMode } from "../../interface";
import { ProviderStack } from "../../ProviderStack";
import cssRaw from "../../index.css?inline";

/** Solid backdrop behind the widget's translucent `background` token. */
const BACKDROP: Record<string, string> = {
  light: "#ffffff",
  dark: "#000209",
};

/**
 * Renders library components the way the widget itself does: in a shadow root
 * with `src/index.css` injected as a `<style>` tag. That isolation is what makes
 * this page possible — the library stylesheet resets `--font-*` and sets
 * `font-family` on `*` with `!important`, so letting it reach the document would
 * restyle the playground chrome around it.
 *
 * A separate React root (rather than a portal) keeps the components in exactly
 * the same environment as production, where focus and positioning logic sees the
 * shadow root as its document.
 */
export const LibrarySurface: FC<{
  /** Color mode the components render in. */
  colorMode: ColorMode;
  /** The components to show. */
  children: ReactNode;
}> = ({ colorMode, children }) => {
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<Root | null>(null);
  // Attaching the shadow root is a DOM effect, so the first render has no root
  // to draw into; this flag schedules the paint that follows it.
  const [attached, setAttached] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (element == null) {
      return;
    }
    root.current ??= createRoot(
      element.shadowRoot ?? element.attachShadow({ mode: "open" }),
    );
    setAttached(true);
  }, []);

  useEffect(() => {
    if (!attached) {
      return;
    }
    root.current?.render(
      <>
        <style>{cssRaw}</style>
        <ProviderStack
          className="space-y-6 rounded-outer bg-background p-6"
          theme={{}}
          colorMode={colorMode}
          languageCode="en-US"
        >
          {children}
        </ProviderStack>
      </>,
    );
  }, [attached, colorMode, children]);

  useEffect(
    () => () => {
      const current = root.current;
      root.current = null;
      // Deferred so React is not asked to unmount a root mid-render.
      queueMicrotask(() => {
        current?.unmount();
      });
    },
    [],
  );

  return (
    <div
      className="rounded-[28px] p-px"
      style={{ background: BACKDROP[colorMode] ?? BACKDROP.light }}
    >
      <div ref={host} />
    </div>
  );
};
