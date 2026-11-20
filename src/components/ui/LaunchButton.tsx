/* eslint-disable jsdoc/require-jsdoc */
import { clsx } from "clsx";
import { type FC } from "react";
import type {
  ConnectConversationHandler,
  CustomLaunchButton,
} from "../../interface";
import { useIcons } from "../../utils/useIcons";

export interface LaunchButtonProps {
  label: string;
  className?: string;
  showLabel?: boolean;
  onClick?: () => void;
  iconUrl?: string;
  Custom?: CustomLaunchButton;
  conversationHandler?: ConnectConversationHandler;
}

export const LaunchButton: FC<LaunchButtonProps> = (props) => {
  const { Touchpoint } = useIcons();
  const { Custom, conversationHandler } = props;
  if (Custom != null && conversationHandler != null) {
    return (
      <Custom
        className={props.className}
        onClick={props.onClick}
        conversationHandler={conversationHandler}
      />
    );
  }
  return (
    <button
      className={clsx(
        "p-3 w-fit bg-background text-primary rounded-outer relative flex items-center gap-2",
        "after:content-[''] after:rounded-outer after:absolute after:inset-0 after:pointer-events-none",
        "enabled:hover:after:bg-primary-10",
        props.className,
      )}
      disabled={props.onClick == null}
      onClick={props.onClick}
      aria-label={props.label}
    >
      <span className="block flex-none w-8 h-8">
        {props.iconUrl == null ? (
          <Touchpoint />
        ) : (
          <img
            src={props.iconUrl}
            alt=""
            role="presentation"
            className="w-8 h-8"
          />
        )}
      </span>
      {(props.showLabel ?? false) ? <span>{props.label}</span> : null}
    </button>
  );
};
