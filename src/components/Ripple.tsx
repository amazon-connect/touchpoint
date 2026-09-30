import type { FC, CSSProperties } from "react";
import { clsx } from "clsx";

import { useProvidedThemeFields } from "./Theme";

/** Seconds for a single circle to expand and fade out. */
const DURATION = 1.5;

const PingCircle: FC<{
  k: number;
  className?: string;
  style?: CSSProperties;
}> = ({ k, className, style }) => {
  return (
    <div
      // Sits at 25% inset of the twice-as-large mask wrapper, i.e. exactly on
      // the container it ripples around, so `animate-ping` grows it from the
      // container edge out to the wrapper edge.
      className={clsx(
        "bg-current animate-ping absolute inset-[25%]",
        className,
      )}
      style={{
        animationDelay: `${-DURATION * k}s`,
        animationDuration: `${DURATION}s`,
        ...(style ?? {}),
      }}
    />
  );
};
/**
 * A ripple effect composed of expanding circles, optionally with a border
 * tracing the container. The circles are masked so they only ever paint outside
 * the container (see `.touchpoint-ripple`), keeping its contents legible.
 *
 * Colored with the theme accent, but only when the consumer set one: the
 * default accent is black/white (see `defaultTheme`), which would render the
 * ripple as a grey smudge, so an unset accent falls back to Touchpoint blue.
 * @category Modality components
 */
export const Ripple: FC<{
  /** Trace the container with a border while the ripple plays. */
  withBorder?: boolean;
  className?: string;
  style?: CSSProperties;
}> = ({ withBorder = false, className, style }) => {
  const hasExplicitAccent = useProvidedThemeFields().includes("accent");
  const cls = clsx(
    hasExplicitAccent
      ? "text-accent-20"
      : // Equivalent to text-focus-20 (the opacity variant does not exist in the theme, hence duplicated here)
        "text-[light-dark(rgba(0,127,217,0.2),rgba(0,149,255,0.2))]",
    className,
  );
  return (
    <>
      {withBorder ? (
        <div
          aria-hidden
          // Inset by its own width so the border sits just outside the
          // container: an opaque container background can't cover it, and it
          // doesn't paint over the contents either.
          className={clsx(
            "border-2 border-solid absolute -inset-0.5 pointer-events-none",
            hasExplicitAccent
              ? "border-accent-50"
              : // Equivalent to border-focus-50 (the opacity variant does not exist in the theme, hence duplicated here)
                "border-[light-dark(rgba(0,127,217,0.5),rgba(0,149,255,0.5))]",
            className,
          )}
        />
      ) : null}
      <div
        aria-hidden
        // Twice the size of the container, centered on it: large enough to hold
        // the fully expanded circles, which the mask then clips.
        className={clsx(
          "touchpoint-ripple absolute inset-[-50%] pointer-events-none",
          className,
        )}
      >
        <PingCircle k={0.12} className={cls} style={style} />
        <PingCircle k={0.24} className={cls} style={style} />
        <PingCircle k={0.36} className={cls} style={style} />
        <PingCircle k={0.48} className={cls} style={style} />
      </div>
    </>
  );
};
