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
   * Default value is "subtle". `"ghost"` is a deprecated alias of `"subtle"`.
   */
  type?: "main" | "subtle" | "ghost" | "error" | "grouped";
  /**
   * Icon component to display inside the button.
   */
  Icon: FC<IconProps>;
}

/**
 * Layout, focus ring and hover overlay shared by every text button and the
 * checkbox rows in a choice group. Transitions are left to the consumer.
 */
export const textButtonBaseClassName =
  "relative z-10 w-full px-5 py-4 focus:outline focus:outline-solid focus:outline-2 focus:outline-offset-1 focus:outline-focus overflow-hidden before:content-[''] before:absolute before:-z-10 before:inset-0 before:bg-transparent";

/** Colors, rounded ends and dividers of a button inside a {@link TextButtonGroup}. */
export const groupedTextButtonClassName =
  "text-primary enabled:hover:before:bg-primary-5 enabled:active:before:bg-primary-10 disabled:text-primary-40 first:rounded-t-outer last:rounded-b-outer not-first:after:content-[''] not-first:after:absolute not-first:after:inset-x-5 not-first:after:top-0 not-first:after:h-px not-first:after:bg-primary-10";

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
  type = "subtle",
  Icon,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={onClick == null}
      className={clsx(
        type === "grouped" ? null : "rounded-outer",
        textButtonBaseClassName,
        "transition-colors before:transition-colors flex justify-between items-center",
        {
          "bg-primary text-secondary enabled:hover:before:bg-primary enabled:active:before:bg-secondary-10 disabled:bg-primary-5 disabled:text-secondary-40":
            type === "main",
          "bg-primary-10 text-primary enabled:hover:before:bg-primary-5 enabled:active:before:bg-secondary-10 disabled:bg-primary-5 disabled:text-primary-20":
            type === "subtle" || type === "ghost",
          "bg-error-primary text-secondary enabled:hover:before:bg-primary-5 disabled:bg-primary-5 disabled:text-secondary-40":
            type === "error",
          [groupedTextButtonClassName]: type === "grouped",
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
