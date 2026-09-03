import clsx from "clsx";
import {
  type FC,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { renderInline } from "../inline";

/** Focus treatment shared by every form control on the page. */
const controlClasses =
  "w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/25";

/** A small circled "i" that reveals an explanatory tooltip on hover or focus. */
export const InfoTip: FC<{ tip: string }> = ({ tip }) => (
  <span className="group relative ml-1.5 inline-flex shrink-0 align-middle">
    <button
      type="button"
      aria-label={tip}
      className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full border border-current text-[9px] font-bold leading-none opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
    >
      i
    </button>
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-[calc(100%+9px)] left-1/2 z-30 w-max max-w-[min(260px,calc(100vw-2rem))] -translate-x-1/2 translate-y-1 rounded-lg bg-heading px-2.5 py-2 text-xs font-normal leading-snug text-canvas opacity-0 shadow-[0_6px_18px_rgba(0,0,0,0.28)] transition duration-150 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
    >
      {tip}
    </span>
  </span>
);

/** Secondary explanatory copy under a field. Supports inline Markdown. */
export const Hint: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="mt-1 text-xs text-muted">{children}</p>
);

/** Convenience wrapper rendering a hint from an inline-Markdown string. */
export const MarkdownHint: FC<{ text: string }> = ({ text }) => (
  <Hint>{renderInline(text)}</Hint>
);

interface FieldProps {
  /** Field label. */
  label: string;
  /** Optional tooltip explaining the field. */
  tip?: string;
  /** `id` of the control this label describes. */
  htmlFor?: string;
  /** The control itself. */
  children: ReactNode;
  /** Optional hint rendered under the control. */
  hint?: ReactNode;
  /** Extra classes for the wrapper. */
  className?: string;
}

/** Label (with optional tooltip) above a control, plus an optional hint below. */
export const Field: FC<FieldProps> = ({
  label,
  tip,
  htmlFor,
  children,
  hint,
  className,
}) => (
  <div className={clsx("mt-3 min-w-0", className)}>
    <div className="mb-1 flex items-center text-[13px] text-muted">
      {htmlFor != null ? (
        <label htmlFor={htmlFor}>{label}</label>
      ) : (
        <span>{label}</span>
      )}
      {tip != null && <InfoTip tip={tip} />}
    </div>
    {children}
    {hint != null && <Hint>{hint}</Hint>}
  </div>
);

/** Text-like input styled to match the page. */
export const TextInput: FC<
  InputHTMLAttributes<HTMLInputElement> & {
    /** Draws the error border, e.g. for a malformed contact ID. */
    invalid?: boolean;
  }
> = ({ invalid = false, className, ...props }) => (
  <input
    {...props}
    aria-invalid={invalid || undefined}
    className={clsx(
      controlClasses,
      invalid ? "border-danger" : "border-line focus:border-accent",
      className,
    )}
  />
);

/** Native select styled to match the page. */
export const Select: FC<SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  ...props
}) => (
  <select
    {...props}
    className={clsx(controlClasses, "border-line focus:border-accent", className)}
  />
);

/**
 * Fields laid out side by side, wrapping to as many columns as fit and stacking
 * on narrow viewports — no fixed column count to overflow.
 */
export const FieldRow: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-3">
    {children}
  </div>
);
