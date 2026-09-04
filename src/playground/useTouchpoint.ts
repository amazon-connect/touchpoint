import { useCallback, useEffect, useRef } from "react";
import { create } from "../index";
import type {
  ColorMode,
  LiveSyncContextInput,
  SendStepParams,
  TouchpointInstance,
} from "../interface";
import type { ConnectConfig } from "../connect";
import { isLiveSyncConfigured, type Settings } from "./settings";

const ignore = (): void => {
  /* the widget surfaces its own connection errors */
};

const buildConnectConfig = (settings: Settings): ConnectConfig => ({
  ...(settings.endpoint !== "" ? { chatEndpoint: settings.endpoint } : {}),
  ...(settings.voiceEndpoint !== ""
    ? { voiceEndpoint: settings.voiceEndpoint }
    : {}),
  ...(settings.authEndpoint !== ""
    ? { authenticationEndpoint: settings.authEndpoint }
    : {}),
  instanceId: settings.instanceId,
  contactFlowId: settings.contactFlowId,
  participantDisplayName:
    settings.displayName === "" ? "Customer" : settings.displayName,
  region: settings.region === "" ? "us-west-2" : settings.region,
  ...(settings.stage !== "" ? { stage: settings.stage } : {}),
});

/** What {@link useTouchpoint} needs to mount the widget. */
interface UseTouchpointParams {
  /** The launched (trimmed) configuration. */
  settings: Settings;
  /** Color mode handed to the widget. */
  colorMode: ColorMode;
  /** Scope and custom actions sent after each (re)connect. */
  context: LiveSyncContextInput;
}

/** The mounted widget's handles. */
export interface Touchpoint {
  /**
   * Mounts a fresh instance, tearing down any previous one. Live Sync's
   * `contactId` is fixed at `create()` time, so binding to a separate contact
   * means creating a new instance.
   */
  mount: (contactId?: string) => void;
  /** Fires a Live Sync script step on the current instance. */
  sendStep: (params: SendStepParams) => void;
}

/**
 * Mounts Touchpoint for the launched configuration and keeps the instance for
 * the lifetime of the guide. Live Sync is only configured when both ACXD keys
 * are supplied; otherwise Touchpoint runs as plain chat/voice.
 */
export const useTouchpoint = (params: UseTouchpointParams): Touchpoint => {
  // Held in a ref so re-renders never re-mount the widget: the launched
  // configuration is fixed, and the action handlers read live state themselves.
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const instance = useRef<TouchpointInstance | null>(null);

  const mount = useCallback((contactId?: string) => {
    const { settings, colorMode } = paramsRef.current;
    const liveSyncEnabled = isLiveSyncConfigured(settings);
    instance.current?.teardown();
    instance.current = null;
    void create({
      config: buildConnectConfig(settings),
      input: settings.inputMode,
      colorMode,
      windowSize: settings.windowSize,
      ...(settings.brandIcon !== "" ? { brandIcon: settings.brandIcon } : {}),
      // Show participant names/avatars in the chat transcript (toggle).
      showParticipantInfo: settings.avatars === "on",
      welcomeScreen: settings.welcomeScreen === "on",
      ...(settings.avatars === "on" && settings.assistantName !== ""
        ? { assistantName: settings.assistantName }
        : {}),
      ...(settings.avatars === "on" && settings.assistantIcon !== ""
        ? { assistantIcon: settings.assistantIcon }
        : {}),
      ...(settings.avatars === "on" && settings.avatarShape !== "round"
        ? { avatarShape: settings.avatarShape }
        : {}),
      ...(liveSyncEnabled
        ? {
            liveSync: {
              deploymentKey: settings.deploymentKey,
              apiKey: settings.apiKey,
              ...(contactId != null && contactId !== "" ? { contactId } : {}),
            },
          }
        : {}),
    }).then((created) => {
      instance.current = created;
      if (liveSyncEnabled) {
        void created.sendContext(paramsRef.current.context);
      }
    }, ignore);
  }, []);

  useEffect(() => {
    mount();
    return () => {
      instance.current?.teardown();
      instance.current = null;
    };
  }, [mount]);

  const sendStep = useCallback((step: SendStepParams) => {
    void instance.current?.sendStep(step).catch(ignore);
  }, []);

  return { mount, sendStep };
};
