import { type FC } from "react";
import { clsx } from "clsx";

import { type MessageStatus } from "../../interface";
import { useCopy } from "../../utils/useCopy";
import { Check, CheckDouble, Error as ErrorIcon, Time } from "./Icons";

/**
 * Delivery status shown under the most recent user message, matching the
 * Amazon Connect widget.
 * @category Modality components
 */
export const MessageStatusRow: FC<{
  status: MessageStatus;
  className?: string;
}> = ({ status, className }) => {
  const copy = useCopy();
  const label = copy.messageStatus[status];
  const iconClass = "w-3.5 h-3.5";
  const icon =
    status === "sending" ? (
      <Time className={iconClass} />
    ) : status === "failed" ? (
      <ErrorIcon className={iconClass} />
    ) : status === "sent" ? (
      <Check className={iconClass} />
    ) : (
      <CheckDouble className={iconClass} />
    );
  return (
    <div
      className={clsx(
        "flex items-center gap-1 text-xs",
        status === "failed"
          ? "text-error-primary"
          : status === "read"
            ? "text-success-primary"
            : "text-primary-40",
        className,
      )}
    >
      {icon}
      <span className="text-primary-60">{label}</span>
    </div>
  );
};
