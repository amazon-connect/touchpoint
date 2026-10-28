import { type FC } from "react";
import { clsx } from "clsx";

import {
  type ScreenShareState,
  type VoiceHandler,
  type VoiceState,
} from "../voice";
import { Close, ScreenShare } from "./ui/Icons";
import { TextButton } from "./ui/TextButton";

/**
 * What the app needs to drive screen sharing, whichever session carries it.
 */
export interface ScreenShareControl {
  /** Where screen sharing stands. */
  state: ScreenShareState;
  /** Why the last attempt failed, if it did. */
  error?: "denied" | "failed";
  /** Start sharing (needs a user gesture). */
  start: () => void;
  /** Stop sharing. */
  stop: () => void;
}

/**
 * Builds a {@link ScreenShareControl} from a live voice session.
 * @param handler - the voice session's handler
 * @param state - the voice session's latest state
 * @returns the control, or `null` while the session has not reported state
 */
export const toScreenShareControl = (
  handler: VoiceHandler,
  state: VoiceState | undefined,
): ScreenShareControl | null =>
  state == null
    ? null
    : {
        state: state.screenShare,
        error: state.screenShareError,
        start: () => {
          void handler.startScreenShare();
        },
        stop: () => {
          void handler.stopScreenShare();
        },
      };

/**
 * The consent prompt and status pill of screen sharing: asks the customer to share,
 * reports progress or failure, and offers to stop. Carries no positioning of its own,
 * so the caller decides where it sits.
 */
export const ScreenShareConsent: FC<{
  control: ScreenShareControl;
  /** Positioning and any other layout classes. */
  className?: string;
}> = ({ control, className }) => {
  const sharing = control.state === "sharing";
  return (
    <div
      role="status"
      className={clsx(
        "flex items-center gap-4 px-4 py-3 max-w-[calc(100vw-2rem)]",
        "bg-background text-primary border border-solid border-primary-10 rounded-outer shadow-lg",
        className,
      )}
    >
      <span className="text-base">
        {sharing
          ? "Your agent can see your screen"
          : control.state === "starting"
            ? "Starting screen share…"
            : control.error === "denied"
              ? "Screen sharing was blocked. Allow it in your browser to try again."
              : control.error === "failed"
                ? "Screen sharing failed. Try again."
                : "Your agent would like to see your screen"}
      </span>
      {sharing ? (
        <TextButton
          label="Stop sharing"
          Icon={Close}
          type="error"
          onClick={control.stop}
        />
      ) : control.state === "available" ? (
        <TextButton
          label="Share screen"
          Icon={ScreenShare}
          type="main"
          onClick={control.start}
        />
      ) : null}
    </div>
  );
};

/**
 * The customer-facing side of screen sharing: a prompt once the agent opens a session,
 * and a frame around the viewport plus a stop control while sharing. Both are fixed to
 * the viewport.
 */
export const ScreenShareOverlay: FC<{
  control: ScreenShareControl | null;
}> = ({ control }) => {
  if (control == null || control.state === "unavailable") {
    return null;
  }
  return (
    <>
      {control.state === "sharing" ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-touchpoint pointer-events-none border-2 border-solid border-[#88D64F]"
        />
      ) : null}
      <ScreenShareConsent
        control={control}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-touchpoint"
      />
    </>
  );
};
