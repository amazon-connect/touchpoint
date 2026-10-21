import { type FC } from "react";
import { clsx } from "clsx";

import { formatTimestamp } from "../../utils/formatTimestamp";

/**
 * Time a message was received, shown below the message bubble.
 */
export const MessageTimestamp: FC<{
  time: number;
  /** Render on its own line instead of inline. */
  block?: boolean;
  className?: string;
}> = ({ time, block = false, className }) => (
  <time
    dateTime={new Date(time).toISOString()}
    className={clsx("text-xs text-primary-60", block && "block", className)}
  >
    {formatTimestamp(time)}
  </time>
);
