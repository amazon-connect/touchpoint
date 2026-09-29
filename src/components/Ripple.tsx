import type { FC, CSSProperties } from "react";
import { clsx } from "clsx";

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
 * A ripple effect composed of expanding circles, along with an accent border
 * tracing the container. The circles are masked so they only ever paint outside
 * the container (see `.touchpoint-ripple`), keeping its contents legible.
 * @category Modality components
 */
export const Ripple: FC<{
  className?: string;
  style?: CSSProperties;
}> = ({ className, style }) => {
  const cls = clsx("text-accent-20", className);
  return (
    <>
      <div
        aria-hidden
        className={clsx(
          "border border-solid border-accent absolute -inset-px pointer-events-none",
          className,
        )}
      />
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
