import clsx from "clsx";
import { type ReactElement } from "react";

/** One choice in a {@link Segmented} control. */
export interface SegmentedOption<T extends string> {
  /** Value reported when selected. */
  value: T;
  /** Visible label. */
  label: string;
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
}

/**
 * Pill-shaped segmented control. Segments wrap rather than overflow, so a long
 * set of options stays usable on narrow viewports.
 */
export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>): ReactElement => (
  <div
    role="group"
    aria-label={label}
    className="flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1"
  >
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={selected}
          onClick={() => {
            onChange(option.value);
          }}
          className={clsx(
            "min-w-fit grow basis-0 whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            selected
              ? "bg-card font-semibold text-heading shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
              : "text-muted hover:text-heading",
          )}
        >
          {option.label}
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
