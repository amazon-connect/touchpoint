import clsx from "clsx";
import { type FC, type ReactElement } from "react";

/** One choice in a {@link Segmented} control. */
export interface SegmentedOption<T extends string> {
  /** Value reported when selected. */
  value: T;
  /** Visible label; the accessible name when the option shows only its icon. */
  label: string;
  /** Shown instead of the label in an `icons` control (e.g. sun/moon). */
  Icon?: FC;
}

interface SegmentedProps<T extends string> {
  /** Accessible group name. */
  label: string;
  /** Currently selected value. */
  value: T;
  /** Available choices. */
  options: SegmentedOption<T>[];
  /** Called with the newly selected value. */
  onChange: (value: T) => void;
  /**
   * `labels` (the default) shows each option's text and fills the available
   * width; `icons` shows the option icons in compact, equally sized segments.
   */
  variant?: "labels" | "icons";
}

/**
 * Pill-shaped segmented control: the playground's one toggle style, used for
 * every either/or choice on the page — the form's options, the design system's
 * mock screen controls, and the top bar's light/dark switch (`icons`).
 *
 * Segments wrap rather than overflow, so a long set of options stays usable on
 * narrow viewports.
 */
export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
  variant = "labels",
}: SegmentedProps<T>): ReactElement => (
  <div
    role="group"
    aria-label={label}
    className="flex flex-wrap gap-0.5 rounded-full border border-line bg-surface p-[3px]"
  >
    {options.map((option) => {
      const selected = option.value === value;
      const icons = variant === "icons" && option.Icon != null;
      const Icon = option.Icon;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={selected}
          aria-label={icons ? option.label : undefined}
          title={icons ? option.label : undefined}
          onClick={() => {
            onChange(option.value);
          }}
          className={clsx(
            "flex items-center justify-center whitespace-nowrap rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            icons
              ? "h-[26px] w-[38px]"
              : "min-w-fit grow basis-0 px-3 py-1.5 text-sm",
            selected
              ? clsx(
                  "bg-card text-heading shadow-[0_1px_3px_rgba(0,0,0,0.18)]",
                  !icons && "font-semibold",
                )
              : "text-muted hover:bg-sidebar-active hover:text-heading",
          )}
        >
          {icons && Icon != null ? <Icon /> : option.label}
        </button>
      );
    })}
  </div>
);

/** Options for the ubiquitous on/off segmented control. */
export const ON_OFF: SegmentedOption<"on" | "off">[] = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];
