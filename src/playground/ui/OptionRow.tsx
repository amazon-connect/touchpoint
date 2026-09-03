import clsx from "clsx";
import { type FC, type ReactNode } from "react";

/** A bordered radio/checkbox row that highlights when selected. */
export const OptionRow: FC<{
  /** `radio` for pick-one groups, `checkbox` for multi-select. */
  type: "radio" | "checkbox";
  /** Shared group name. */
  name: string;
  /** This option's value. */
  value: string;
  /** Whether the option is currently selected. */
  checked: boolean;
  /** Called when the option is toggled. */
  onChange: (checked: boolean) => void;
  /** Option label. */
  children: ReactNode;
  /** Right-aligned secondary detail, e.g. a price. */
  meta?: string;
}> = ({ type, name, value, checked, onChange, children, meta }) => (
  <label
    className={clsx(
      "mb-2 flex cursor-pointer items-center gap-3 rounded-[10px] border bg-card px-4 py-3 leading-tight transition-colors",
      checked ? "border-select" : "border-line hover:border-muted",
    )}
  >
    <input
      type={type}
      name={name}
      value={value}
      checked={checked}
      onChange={(event) => {
        onChange(event.target.checked);
      }}
      className="size-4 shrink-0 accent-select"
    />
    <span className="min-w-0">{children}</span>
    {meta != null && (
      <span className="ml-auto shrink-0 text-sm font-semibold text-heading">
        {meta}
      </span>
    )}
  </label>
);
