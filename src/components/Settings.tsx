/* eslint-disable jsdoc/require-jsdoc */
import { type FC, useState } from "react";

import { Undo, Download, Exit, Close, Warning } from "./ui/Icons";
import { useCopy } from "../utils/useCopy";
import { TextButton } from "./ui/TextButton";
import { clsx } from "clsx";
import { IconButton } from "./ui/IconButton";

interface SettingsProps {
  onClose: () => void;
  /** Restart the conversation (new contact). */
  onRestart: () => void;
  /** Download the conversation transcript. */
  onDownloadTranscript: () => void;
  /** End the current conversation. */
  onEndConversation: () => void;
  /** Whether a human agent is currently active (disables bot-only options). */
  agentActive: boolean;
  /** Whether the conversation has ended (disables escalation & ending). */
  ended: boolean;
  /** Voice input: hides chat-only options (escalation, transcript download). */
  voiceMode?: boolean;
  className?: string;
}

export const Settings: FC<SettingsProps> = ({
  onClose,
  onRestart,
  onDownloadTranscript,
  onEndConversation,
  agentActive,
  ended,
  voiceMode = false,
  className,
}) => {
  const copy = useCopy();
  const [confirmEnd, setConfirmEnd] = useState<boolean>(false);

  return (
    // Full-width/height surface so the confirm overlay (absolute inset-0) covers
    // it entirely; the options themselves stay width-constrained via `className`.
    <div className="p-2 md:p-3 flex flex-col relative grow justify-center">
      <div className={clsx("flex flex-col gap-2", className)}>
        <TextButton
          label={copy.restartConversationButtonLabel}
          Icon={Undo}
          type="ghost"
          onClick={
            agentActive && !ended
              ? undefined
              : () => {
                  onRestart();
                }
          }
        />
        {/* Transcript download is chat-only; hidden in voice mode. */}
        {!voiceMode ? (
          <TextButton
            label={copy.downloadTranscriptButtonLabel}
            Icon={Download}
            type="ghost"
            onClick={() => {
              onDownloadTranscript();
            }}
          />
        ) : null}
        <TextButton
          label={copy.endConversationButtonLabel}
          Icon={Exit}
          type="ghost"
          onClick={
            ended
              ? undefined
              : () => {
                  setConfirmEnd(true);
                }
          }
        />
      </div>

      {confirmEnd ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-outer bg-secondary p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-80">
                <Warning className="w-5 h-5 flex-none" />
                <span className="text-base font-semibold">
                  {copy.endConversationConfirm.title}
                </span>
              </div>
              <IconButton
                type="ghost"
                Icon={Close}
                label={copy.endConversationConfirm.cancel}
                onClick={() => {
                  setConfirmEnd(false);
                }}
              />
            </div>
            <p className="text-sm text-primary-60">
              {copy.endConversationConfirm.body}
            </p>
            <TextButton
              label={copy.endConversationConfirm.confirm}
              Icon={Exit}
              type="error"
              onClick={() => {
                setConfirmEnd(false);
                onEndConversation();
                onClose();
              }}
            />
            <TextButton
              label={copy.endConversationConfirm.cancel}
              Icon={Close}
              type="ghost"
              onClick={() => {
                setConfirmEnd(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
