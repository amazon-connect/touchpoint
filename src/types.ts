import type { TouchpointConfiguration } from "./interface";

/**
 * The settings that {@link TouchpointConfiguration} declares as optional but
 * which the normalization in `App` always resolves to a concrete value.
 */
type NormalizedField =
  | "languageCode"
  | "input"
  | "windowSize"
  | "colorMode"
  | "animate"
  | "backgroundDepthLayer"
  | "launchIcon"
  | "userMessageBubble"
  | "agentMessageBubble"
  | "chatMode"
  | "welcomeScreen"
  | "welcomeScreenLogo"
  | "showParticipantInfo"
  | "showVoiceTranscript"
  | "escalationPhrase"
  | "modalityComponents"
  | "initializeConversation";

/**
 * The configuration after defaults have been applied and all custom style
 * objects have been sanitized. Every optional setting that has a default is
 * resolved here, so no component downstream needs to apply one.
 *
 * The property types are inherited from {@link TouchpointConfiguration}:
 * `Required` strips both the optionality and the `undefined`, so adding a
 * default only means listing the field in {@link NormalizedField}.
 */
export type NormalizedTouchpointConfiguration = TouchpointConfiguration &
  Required<Pick<TouchpointConfiguration, NormalizedField>>;
