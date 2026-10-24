/* eslint-disable jsdoc/require-jsdoc */
import { type Context, type Response } from "../core";

import { type ConnectConversationHandler } from "../connect";
import { useEffect, useLayoutEffect, useRef, type FC } from "react";
import { clsx } from "clsx";

import type { BrandIconSource, CustomModalityComponent } from "../interface";
import { initiateVoice } from "../voice";
import { LoaderAnimation } from "./ui/Loader";
import { Ripple } from "./Ripple";
import { IconButton } from "./ui/IconButton";
import { useIcons } from "../utils/useIcons";
import { TextButton } from "./ui/TextButton";
import { BrandIcon } from "./ui/BrandIcon";
import { useWidgetVoiceState } from "./FullscreenVoice";
import { VoiceModalities } from "./VoiceModalities";
import { Banner } from "./ui/Banner";
import { type ScreenShareControl, toScreenShareControl } from "./ScreenShare";
import {
  VoiceMiniControls,
  VoiceMiniPanel,
  voiceMiniPanelClass,
} from "./Layout";
import { type DragHandleProps } from "../utils/useDraggable";

const VoiceMiniLoader: FC<{
  brandIcon?: BrandIconSource;
  dragHandleProps?: DragHandleProps;
}> = ({ brandIcon, dragHandleProps }) => {
  const { Close, Mic, Volume } = useIcons();
  return (
    <VoiceMiniControls className="relative" dragHandleProps={dragHandleProps}>
      {brandIcon != null ? <BrandIcon icon={brandIcon} square={true} /> : null}
      <IconButton
        Icon={Volume}
        label="Speakers"
        type="ghost"
        className="invisible"
      />
      <IconButton
        Icon={Mic}
        label="Microphone"
        type="ghost"
        className="invisible"
      />
      <IconButton
        Icon={Close}
        label="Close"
        type="ghost"
        className="invisible"
      />
      <span className="w-6 h-6 block text-accent absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <LoaderAnimation />
      </span>
    </VoiceMiniControls>
  );
};

export const VoiceMini: FC<{
  modalityComponents: Record<string, CustomModalityComponent<unknown>>;
  showTranscript: boolean;
  responses: Response[];
  handler: ConnectConversationHandler;
  brandIcon?: BrandIconSource;
  /** When undefined, the panel is not closable. */
  onClose: ((event: Event) => void) | undefined;
  /** Called when the voice session ends (call disconnected / agent hung up). */
  onVoiceSessionEnded: () => void;
  /** Reports the screen share control of the live session (`null` when there is none). */
  onScreenShareChange?: (control: ScreenShareControl | null) => void;
  context?: Context;
  /** When provided, renders a drag handle to reposition the widget. */
  dragHandleProps?: DragHandleProps;
}> = ({
  handler,
  context,
  showTranscript,
  onClose,
  onVoiceSessionEnded,
  onScreenShareChange,
  modalityComponents,
  responses,
  brandIcon,
  dragHandleProps,
}) => {
  const { Close, Mic, MicOff, Restart, Volume, VolumeOff } = useIcons();
  const onCloseHandler = (): void => {
    onClose?.(new Event("close"));
  };

  const [voice, setVoice] = useWidgetVoiceState();

  useEffect(() => {
    const fn = async (): Promise<void> => {
      try {
        const voiceHandler = await initiateVoice(
          handler,
          context ?? {},
          (newVoiceState) => {
            setVoice((prev) =>
              prev === null || prev === "loading" || prev.type === "error"
                ? prev
                : { ...prev, state: newVoiceState },
            );
          },
        );
        setVoice({ type: "success", handler: voiceHandler });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[touchpoint] voice connection failed:", err);
        setVoice({ type: "error", error: String(err) });
      }
    };
    void fn();
  }, [handler, setVoice, context]);

  // The voice session has ended — the call was disconnected, or an escalated
  // human agent resolved the contact and hung up (Chime reports `MeetingEnded`).
  const terminated =
    voice != null &&
    voice !== "loading" &&
    voice.type === "success" &&
    voice.state?.isTerminated === true;

  // Report the ended session to the app, which fires `onContactEnded` and, by
  // default, collapses the widget. useLayoutEffect runs before paint, so when a
  // collapse follows there is no flash of the ended state below.
  const endedReported = useRef(false);
  useLayoutEffect(() => {
    if (terminated && !endedReported.current) {
      endedReported.current = true;
      onVoiceSessionEnded();
    }
  }, [terminated, onVoiceSessionEnded]);

  // Surface screen sharing (offered by the agent during the call) to the app.
  useEffect(() => {
    onScreenShareChange?.(
      voice != null && voice !== "loading" && voice.type === "success"
        ? toScreenShareControl(voice.handler, voice.state)
        : null,
    );
    return () => {
      onScreenShareChange?.(null);
    };
  }, [voice, onScreenShareChange]);

  const retry = async (): Promise<void> => {
    try {
      if (voice != null && voice !== "loading" && voice.type !== "error") {
        await voice.handler.disconnect();
      }
      setVoice(null);
      const voiceHandler = await initiateVoice(
        handler,
        context ?? {},
        (newVoiceState) => {
          setVoice((prev) =>
            prev === null || prev === "loading" || prev.type === "error"
              ? prev
              : { ...prev, state: newVoiceState },
          );
        },
      );
      setVoice({ type: "success", handler: voiceHandler });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[touchpoint] voice connection failed:", err);
      setVoice({ type: "error", error: String(err) });
    }
  };

  if (voice == null || voice === "loading") {
    return (
      <VoiceMiniLoader
        brandIcon={brandIcon}
        dragHandleProps={dragHandleProps}
      />
    );
  }

  if (voice.type === "error") {
    return (
      <VoiceMiniPanel onClose={onClose != null ? onCloseHandler : undefined}>
        <Banner type="error">I couldn’t connect</Banner>
        <TextButton
          type="subtle"
          label="Retry"
          Icon={Restart}
          onClick={() => {
            void retry();
          }}
        />
      </VoiceMiniPanel>
    );
  }

  if (terminated) {
    // When the app collapses the widget (the default), the layout effect above
    // unmounts this before paint. If collapse is cancelled or unavailable
    // (embedded), this ended state is shown instead.
    return (
      <VoiceMiniPanel>
        <p className="text-primary text-base px-3 py-2">
          The conversation has ended.
        </p>
      </VoiceMiniPanel>
    );
  }

  const micEnabled = voice.state?.isMicEnabled ?? true;
  const speakersEnabled = voice.state?.isSpeakersEnabled ?? true;

  return (
    <VoiceMiniControls dragHandleProps={dragHandleProps}>
      {brandIcon != null ? <BrandIcon icon={brandIcon} square={true} /> : null}
      <div className="w-fit relative">
        {voice.state?.isApplicationSpeaking ? (
          <Ripple className="rounded-full" />
        ) : null}
        <IconButton
          Icon={speakersEnabled ? Volume : VolumeOff}
          label="Speakers"
          // Neutral in both states; the icon (Volume vs VolumeOff) conveys state.
          type="ghost"
          onClick={() => {
            void voice.handler.setSpeakers(!speakersEnabled);
          }}
        />
      </div>
      <div className="w-fit relative">
        {voice.state?.isUserSpeaking ? (
          <Ripple className="rounded-full" />
        ) : null}
        <IconButton
          Icon={voice.state?.isMicEnabled ? Mic : MicOff}
          label="Microphone"
          // Neutral in both states; the icon (Mic vs MicOff) conveys mute state.
          type="ghost"
          onClick={() => {
            void voice.handler.setMicrophone(!micEnabled);
          }}
        />
      </div>
      <IconButton
        label="Close"
        Icon={Close}
        type="error"
        onClick={() => {
          onCloseHandler();
        }}
      />
      <VoiceModalities
        className={clsx(
          voiceMiniPanelClass,
          "absolute right-0 -top-2 transform translate-x-0 -translate-y-full max-h-[360px] overflow-auto",
        )}
        responses={responses}
        renderedAsOverlay={false}
        showTranscript={showTranscript}
        modalityComponents={modalityComponents}
        handler={handler}
      />
    </VoiceMiniControls>
  );
};
