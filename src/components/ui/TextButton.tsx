import { clsx } from "clsx";
import { type ReactNode, type FC } from "react";

import { type IconProps } from "./Icons";

/**
 * Props for the TextButton component
 * @inline
 * @hidden
 */
export interface TextButtonProps {
  /**
   * Handler function called when the button is clicked
   */
  onClick?: () => void;
  /**
   * Text to display on the button
   */
  label: string;
  /**
   * Additional CSS classes to apply to the button
   */
  className?: string;
  /**
   * Visual style variant of the button
   * Default value is "ghost"
   */
  type?: "main" | "ghost" | "error" | "grouped";
  /**
   * Icon component to display inside the button.
   */
  Icon: FC<IconProps>;
}

/**
 * A button with a visible textual label
 * @example
 * ```tsx
 * import { TextButton, ArrowForward, React } from '@amazon-connect-touchpoint/web';
 *
 * const MyTextButton = ({ onClickHandler }) => (
 *  <TextButton
 *    onClick={onClickHandler}
 *    label="Continue"
 *  />
 * );
 * ```
 * @category Modality components
 */
export const TextButton: FC<TextButtonProps> = ({
  onClick,
  label,
  type = "ghost",
  Icon,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={onClick == null}
      className={clsx(
        type === "grouped" ? null : "rounded-outer",
        "relative z-10 w-full px-5 py-4 transition-colors flex justify-between items-center focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-focus overflow-hidden before:content-[''] before:absolute before:transition-colors before:-z-10 before:inset-0 before:bg-transparent",
        {
          "bg-primary-90 text-secondary-90 enabled:hover:before:bg-primary-90 enabled:active:before:bg-secondary-10 disabled:bg-primary-5 disabled:text-secondary-40":
            type === "main",
          "bg-primary-10 text-primary-90 enabled:hover:before:bg-primary-5 enabled:active:before:bg-secondary-10 disabled:bg-primary-5 disabled:text-primary-20":
            type === "ghost",
          "bg-error-primary text-secondary-90 enabled:hover:before:bg-primary-5 disabled:bg-primary-5 disabled:text-secondary-40":
            type === "error",
          "text-primary-90 enabled:hover:before:bg-primary-5 enabled:active:before:bg-primary-10 disabled:text-primary-40 first:rounded-t-outer last:rounded-b-outer not-first:after:content-[''] not-first:after:absolute not-first:after:inset-x-5 not-first:after:top-0 not-first:after:h-px not-first:after:bg-primary-10":
            type === "grouped",
        },
        className,
      )}
    >
      {label}
      <Icon size={16} />
    </button>
  );
};

interface TextButtonGroupProps {
  /**
   * Additional CSS classes to apply to the button
   */
  className?: string;
  /**
   * Children
   */
  children?: ReactNode;
  /**
   * ARIA role to apply to the group, e.g. "group" for a set of related choices
   */
  role?: string;
  /**
   * Accessible label describing the group, used with `role`
   */
  "aria-label"?: string;
}

/**
 * A group of text buttons
 */
export const TextButtonGroup: FC<TextButtonGroupProps> = (props) => (
  <div
    role={props.role}
    aria-label={props["aria-label"]}
    className={clsx(
      props.className,
      "bg-primary-5 border border-solid border-primary-10 rounded-outer",
    )}
  >
    {props.children}
  </div>
);
