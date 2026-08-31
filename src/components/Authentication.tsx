import { type FC } from "react";
import { clsx } from "clsx";

import { type AuthenticationStatus } from "../connect";
import { useCopy } from "../utils/useCopy";
import { ArrowForward, Check, Error as ErrorIcon } from "./ui/Icons";
import { TextButton } from "./ui/TextButton";

// Terminal-negative statuses, shown with an error style.
const FAILURE_STATUSES: AuthenticationStatus[] = [
  "failed",
  "expired",
  "cancelled",
];

// English fallback used when `copy.authentication` is not provided.
const DEFAULT_COPY = {
  heading: "Please authenticate",
  authenticate: "Authenticate",
  continueWithoutSigningIn: "Continue without signing in",
  lockedInputHint: "Complete or skip authentication before continuing.",
  status: {
    prompt: "Please authenticate",
    in_progress: "Authentication in progress",
    success: "Authentication successful",
    failed: "Authentication failed",
    expired: "Authentication expired",
    cancelled: "Authentication cancelled",
  },
} satisfies NonNullable<ReturnType<typeof useCopy>["authentication"]>;

/**
 * Renders the Amazon Connect chat authentication card (Authenticate Customer
 * flow block). A single card transitions through {@link AuthenticationStatus}:
 * a prompt with an "Authenticate" action, a working indicator, then a terminal
 * success/failure state. `onAuthenticate` opens the hosted identity-provider
 * login. `onCancel`, when provided, skips sign-in (cancels authentication so the
 * flow takes its opt-out branch). Terminal states show no retry — once the flow
 * has moved past the Authenticate Customer block the session can't be reused.
 */
export const Authentication: FC<{
  status: AuthenticationStatus;
  onAuthenticate: () => void;
  onCancel?: () => void;
}> = ({ status, onAuthenticate, onCancel }) => {
  const copy = useCopy().authentication ?? DEFAULT_COPY;
  const isFailure = FAILURE_STATUSES.includes(status);

  return (
    <div className="space-y-2">
      <p className="text-primary-80 text-base">{copy.heading}</p>
      <div className="rounded-outer border border-solid border-primary-20 p-2 space-y-2">
        {status === "prompt" ? (
          <>
            <TextButton
              type="main"
              label={copy.authenticate}
              Icon={ArrowForward}
              onClick={onAuthenticate}
            />
            {onCancel != null ? (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-1 text-sm text-center text-primary-40 hover:text-primary-60 focus:outline-0"
              >
                {copy.continueWithoutSigningIn}
              </button>
            ) : null}
          </>
        ) : (
          <div
            className={clsx(
              "flex items-center justify-center gap-2 py-1 text-base",
              isFailure ? "text-red-500" : "text-primary-60",
            )}
          >
            {status === "success" ? (
              <Check size={16} />
            ) : isFailure ? (
              <ErrorIcon size={16} />
            ) : (
              <span
                className="w-1.5 h-1.5 rounded-full bg-current animate-auth-pulse"
                aria-hidden="true"
              />
            )}
            <span>{copy.status[status]}</span>
          </div>
        )}
      </div>
    </div>
  );
};
