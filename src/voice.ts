import {
  type AudioVideoFacade,
  type AudioVideoObserver,
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  MeetingSessionStatusCode,
} from "amazon-chime-sdk-js";
import { type Context } from "@nlxai/core";

import { type ConnectConversationHandler } from "./connect";

import { type WebRtcConnectionData } from "./connect";

/**
 * How to handle voice connections.
 */
export interface VoiceHandler {
  /** Enable or disable the microphone. */
  setMicrophone: (micEnabled: boolean) => Promise<void>;
  /** Enable or disable the speakers. */
  setSpeakers: (speakersEnabled: boolean) => Promise<void>;
  /** Retry connecting to the voice service. */
  retry: () => Promise<void>;
  /** Disconnect from the voice service. Must be called at the end of the session. */
  disconnect: () => Promise<void>;
}

/**
 * The state of the voice connection.
 */
export interface VoiceState {
  /** Whether the voice connection has been terminated from the remote end. */
  isTerminated: boolean;
  /** Is the user speaking at the moment. */
  isUserSpeaking: boolean;
  /** Is the application/agent speaking at the moment. */
  isApplicationSpeaking: boolean;
  /** Are the speakers enabled */
  isSpeakersEnabled: boolean;
  /** Is the mic enabled */
  isMicEnabled: boolean;
  /** Interim message */
  interimMessage?: string;
}

/** Thrown when we detect missing audio permissions */
export class MissingAudioPermissionsError extends Error {
  /** */
  constructor() {
    super("Missing audio permissions");
    this.name = "MissingAudioPermissionsError";
  }
}

/** Volume above which an attendee is considered to be speaking. */
const SPEAKING_VOLUME_THRESHOLD = 0.05;

/** How long a speaking indicator lingers after speech stops, to smooth over brief pauses. */
const SPEAKING_OFF_DELAY_MS = 500;

/**
 * Creates a setter for a speaking flag that switches on instantly, but off only after
 * {@link SPEAKING_OFF_DELAY_MS} of continuous silence. Speech resuming within that window
 * cancels the pending switch-off, so short gaps between words don't flicker the UI.
 * @param isOn - reads the currently published value of the flag
 * @param apply - publishes a new value of the flag
 * @returns `set` to feed raw values in, `cancel` to drop any pending switch-off
 */
const createSpeakingFlag = (
  isOn: () => boolean,
  apply: (speaking: boolean) => void,
): { set: (speaking: boolean) => void; cancel: () => void } => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const cancel = (): void => {
    if (timeout != null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return {
    set: (speaking) => {
      if (speaking) {
        cancel();
        if (!isOn()) {
          apply(true);
        }
      } else if (isOn() && timeout == null) {
        timeout = setTimeout(() => {
          timeout = null;
          apply(false);
        }, SPEAKING_OFF_DELAY_MS);
      }
    },
    cancel,
  };
};

/**
 * Opens an Amazon Connect in-app/web voice session over WebRTC using the Amazon Chime SDK.
 *
 * The conversation handler resolves the Chime connection data (via Amazon Connect's
 * `StartWebRTCContact`); this joins that Chime meeting, opens the microphone, and plays the
 * remote audio, surfacing connection state through {@link VoiceState}.
 * @param handler - the Amazon Connect conversation handler (must expose `startWebRtcContact`)
 * @param _context - reserved for parity with the previous signature; unused
 * @param onStateChanged - called whenever the voice state changes
 * @returns a {@link VoiceHandler} controlling the live session
 */
export const initiateVoice = async (
  handler: ConnectConversationHandler,
  _context: Context,
  onStateChanged?: (state: VoiceState) => void,
): Promise<VoiceHandler> => {
  const state: VoiceState = {
    isTerminated: false,
    isUserSpeaking: false,
    isApplicationSpeaking: false,
    isSpeakersEnabled: true,
    isMicEnabled: true,
  };

  const setState = (newState: Partial<VoiceState>): void => {
    Object.assign(state, newState);
    onStateChanged?.(state);
  };

  const userSpeaking = createSpeakingFlag(
    () => state.isUserSpeaking,
    (isUserSpeaking) => {
      setState({ isUserSpeaking });
    },
  );
  const applicationSpeaking = createSpeakingFlag(
    () => state.isApplicationSpeaking,
    (isApplicationSpeaking) => {
      setState({ isApplicationSpeaking });
    },
  );

  const startWebRtcContact = (
    handler as unknown as {
      startWebRtcContact?: () => Promise<WebRtcConnectionData>;
    }
  ).startWebRtcContact;
  if (startWebRtcContact == null) {
    throw new Error("Voice is not supported by this conversation handler.");
  }

  let meetingSession: DefaultMeetingSession | null = null;
  let audioElement: HTMLAudioElement | null = null;
  let localAttendeeId: string | undefined;
  const volumeSubscriptions = new Set<string>();

  const disconnect = async (): Promise<void> => {
    userSpeaking.cancel();
    applicationSpeaking.cancel();
    setState({ isUserSpeaking: false, isApplicationSpeaking: false });
    const av = meetingSession?.audioVideo;
    if (av != null) {
      try {
        av.stop();
      } catch {
        /* best effort */
      }
      try {
        await av.stopAudioInput();
      } catch {
        /* best effort */
      }
    }
    meetingSession = null;
    volumeSubscriptions.clear();
    if (audioElement != null) {
      audioElement.srcObject = null;
      audioElement.remove();
      audioElement = null;
    }
  };

  const connect = async (): Promise<void> => {
    const connectionData = await startWebRtcContact();
    if (connectionData?.meeting == null || connectionData?.attendee == null) {
      throw new Error("StartWebRTCContact returned no Chime connection data.");
    }

    const logger = new ConsoleLogger("TouchpointVoice", LogLevel.WARN);
    const deviceController = new DefaultDeviceController(logger);
    const configuration = new MeetingSessionConfiguration(
      connectionData.meeting,
      connectionData.attendee,
    );
    localAttendeeId = configuration.credentials?.attendeeId ?? undefined;

    const session = new DefaultMeetingSession(
      configuration,
      logger,
      deviceController,
    );
    meetingSession = session;
    const av: AudioVideoFacade = session.audioVideo;

    // Bind an (offscreen) element for the remote audio.
    audioElement = document.createElement("audio");
    audioElement.style.display = "none";
    document.body.appendChild(audioElement);
    void av.bindAudioElement(audioElement);

    // Open the microphone — prompts for permission on first use.
    try {
      const inputs = await av.listAudioInputDevices();
      if (inputs.length === 0) {
        throw new MissingAudioPermissionsError();
      }
      await av.startAudioInput(inputs[0].deviceId);
    } catch (err) {
      await disconnect();
      if (
        err instanceof MissingAudioPermissionsError ||
        (err instanceof DOMException && err.name === "NotAllowedError")
      ) {
        throw new MissingAudioPermissionsError();
      }
      throw new Error("Failed to access the microphone");
    }

    // Remote end / call termination.
    const observer: AudioVideoObserver = {
      audioVideoDidStop: (sessionStatus) => {
        if (sessionStatus.statusCode() !== MeetingSessionStatusCode.Left) {
          setState({ isTerminated: true });
        }
        void disconnect();
      },
    };
    av.addObserver(observer);

    // Speaking indicators, derived from each attendee's volume. The local attendee drives
    // `isUserSpeaking`; any remote attendee (the agent) drives `isApplicationSpeaking`.
    av.realtimeSubscribeToAttendeeIdPresence((attendeeId, present) => {
      if (present) {
        if (!volumeSubscriptions.has(attendeeId)) {
          volumeSubscriptions.add(attendeeId);
          av.realtimeSubscribeToVolumeIndicator(
            attendeeId,
            (id, volume, muted) => {
              const speaking =
                volume != null && volume > SPEAKING_VOLUME_THRESHOLD && !muted;
              // The volume indicator fires many times per second; the speaking flags only
              // propagate actual transitions, avoiding a re-render storm (which visibly
              // shakes the UI), and hold on briefly after speech stops.
              if (id === localAttendeeId) {
                userSpeaking.set(speaking);
              } else {
                applicationSpeaking.set(speaking);
              }
            },
          );
        }
      } else {
        volumeSubscriptions.delete(attendeeId);
        av.realtimeUnsubscribeFromVolumeIndicator(attendeeId);
      }
    });

    av.start();

    // Reflect the current mic state on the fresh session.
    if (state.isMicEnabled) {
      av.realtimeUnmuteLocalAudio();
    } else {
      av.realtimeMuteLocalAudio();
    }
  };

  await connect();

  return {
    async setMicrophone(micEnabled) {
      setState({ isMicEnabled: micEnabled });
      const av = meetingSession?.audioVideo;
      if (av != null) {
        if (micEnabled) {
          av.realtimeUnmuteLocalAudio();
        } else {
          av.realtimeMuteLocalAudio();
        }
      }
    },
    async setSpeakers(speakersEnabled) {
      setState({ isSpeakersEnabled: speakersEnabled });
      if (audioElement != null) {
        audioElement.muted = !speakersEnabled;
      }
    },
    async retry() {
      await disconnect();
      await connect();
    },
    disconnect,
  };
};
