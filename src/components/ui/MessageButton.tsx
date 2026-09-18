import { clsx } from "clsx";
import { type FC } from "react";

import { type IconProps } from "./Icons";
import { HeadlessIconButton } from "./IconButton";

/**
 * Represents the different types of message buttons available in the application.
 *
 * - `default`: The default message button.
 * - `selected`: A message button showing the selected state.
 * - `unselected`: A message button showing the unselected state.
 * @category Modality components
 */
export type MessageButtonType = "default" | "selected" | "unselected";

/**
 * Props for the MessageButton component
 * @inline
 * @hidden
 */
export interface MessageButtonProps {
  /**
   * Handler function called when the button is clicked
   */
  onClick?: () => void;
  /**
   * Accessible label for the button
   */
  label: string;
  /**
   * Additional CSS classes to apply to the button
   */
  className?: string;
  /**
   * Visual style variant of the button. One of MessageButtonType.
   * @default "default"
   */
  type?: MessageButtonType;
  /**
   * Icon component to display inside the button
   */
  Icon: FC<IconProps>;
}

const baseClass =
  "p-2.5 w-8 h-8 transition-colors rounded-inner relative z-10 overflow-hidden focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-focus";

const defaultClass =
  "text-primary-60 enabled:hover:bg-primary-5 enabled:active:bg-primary-10 disabled:text-primary-20";

const selectedClass =
  "text-primary-90 enabled:hover:bg-primary-5 enabled:active:bg-primary-10 disabled:text-primary-40";

const unselectedClass =
  "text-primary-40 enabled:hover:bg-primary-5 enabled:active:bg-primary-10 disabled:text-primary-10";

/**
 * A button showing only an icon (textual label is provided for accessibility)
 * @example
 * ```tsx
 * import { MessageButton, Icons, React } from '@amazon-connect-touchpoint/web';
 *
 * const MyMessageButton = () => (
 *   <MessageButton
 *     label="Send message"
 *     onClick={() => alert('Icon button clicked!')}
 *     Icon={Icons.ArrowForward}
 *   />
 * );
 * ```
 * @category Modality components
 */
export const MessageButton: FC<MessageButtonProps> = ({
  onClick,
  type = "default",
  label,
  className,
  Icon,
}) => {
  return (
    <HeadlessIconButton
      onClick={onClick}
      label={label}
      className={clsx(
        baseClass,
        type === "default" ? defaultClass : null,
        type === "selected" ? selectedClass : null,
        type === "unselected" ? unselectedClass : null,
        className,
      )}
    >
      <Icon size={12} />
    </HeadlessIconButton>
  );
};
