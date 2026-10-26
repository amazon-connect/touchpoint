/* eslint-disable jsdoc/require-jsdoc */
import { type FC, useState } from "react";

import { useIcons } from "../utils/useIcons";
import { useCopy } from "../utils/useCopy";
import { TextButton } from "./ui/TextButton";
import { clsx } from "clsx";
import { EndConversationConfirm } from "./EndConversationConfirm";

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
  const { Download, LogOut, Restart } = useIcons();
  const copy = useCopy();
  const [confirmEnd, setConfirmEnd] = useState<boolean>(false);

  return (
    // Full-width/height surface so the confirm overlay (absolute inset-0) covers
    // it entirely; the options themselves stay width-constrained via `className`.
    <div className="p-2 md:p-3 flex flex-col relative grow justify-center">
      <div className={clsx("flex flex-col gap-2", className)}>
        <TextButton
          label={copy.restartConversationButtonLabel}
          Icon={Restart}
          type="subtle"
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
            type="subtle"
            onClick={() => {
              onDownloadTranscript();
            }}
          />
        ) : null}
        <TextButton
          label={copy.endConversationButtonLabel}
          Icon={LogOut}
          type="subtle"
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
        <EndConversationConfirm
          onCancel={() => {
            setConfirmEnd(false);
          }}
          onConfirm={() => {
            setConfirmEnd(false);
            onEndConversation();
            onClose();
          }}
        />
      ) : null}
    </div>
  );
};
