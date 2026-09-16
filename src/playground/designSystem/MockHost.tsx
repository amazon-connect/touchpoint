import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import cssRaw from "../../index.css?inline";

/**
 * Bare shadow-root host for library components that manage their own fixed
 * positioning and theming (e.g. the mock chat frames). Unlike
 * {@link import("./LibrarySurface").LibrarySurface}, it adds no card chrome or
 * `ProviderStack` of its own — the child supplies both — so `position: fixed`
 * inside it lands relative to the viewport rather than a decorated box.
 */
export const MockHost: FC<{
  /** The self-styled, self-positioned component to render. */
  children: ReactNode;
}> = ({ children }) => {
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<Root | null>(null);
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
        {children}
      </>,
    );
  }, [attached, children]);

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

  return <div ref={host} />;
};
