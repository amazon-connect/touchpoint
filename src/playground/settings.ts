import type { Input, WindowSize } from "../interface";

/**
 * Free-text configuration fields. The order is the order they are written back
 * to the URL query string on launch.
 */
export const TEXT_FIELDS = [
  "endpoint",
  "voiceEndpoint",
  "authEndpoint",
  "instanceId",
  "contactFlowId",
  "region",
  "stage",
  "displayName",
  "deploymentKey",
  "apiKey",
  "assistantName",
  "assistantIcon",
  "brandIcon",
] as const;

/** Key of a free-text configuration field. */
export type TextFieldKey = (typeof TEXT_FIELDS)[number];

/** On/off segmented control value. */
export type Toggle = "on" | "off";

/** Participant avatar shape. */
export type AvatarShape = "round" | "square";

/** Everything the launch form collects. */
export type Settings = Record<TextFieldKey, string> & {
  /** Interaction mode: chat, full-screen voice, voice mini, or external. */
  inputMode: Input;
  /** Presentation layout for chat and full-screen voice. */
  windowSize: WindowSize;
  /** Whether the chat transcript shows participant avatars and names. */
  avatars: Toggle;
  /** Whether the immersive welcome screen is shown for chat. */
  welcomeScreen: Toggle;
  /** Shape of participant avatars. */
  avatarShape: AvatarShape;
};

const INPUT_MODES: Input[] = ["text", "voice", "voiceMini", "external"];

const WINDOW_SIZES: WindowSize[] = ["half", "full", "floating", "side-by-side"];

/** Defaults, matching the values the original static playground shipped with. */
export const DEFAULT_SETTINGS: Settings = {
  endpoint: "",
  voiceEndpoint: "",
  authEndpoint: "",
  instanceId: "",
  contactFlowId: "",
  region: "us-west-2",
  stage: "",
  displayName: "Customer",
  deploymentKey: "",
  apiKey: "",
  assistantName: "",
  assistantIcon: "",
  brandIcon: "",
  inputMode: "voiceMini",
  windowSize: "half",
  avatars: "on",
  welcomeScreen: "on",
  avatarShape: "round",
};

const pick = <T extends string>(
  raw: string | null,
  allowed: T[],
  fallback: T,
): T => (allowed.includes(raw as T) ? (raw as T) : fallback);

/**
 * Reads the launch form's initial state from the URL query string, so a
 * playground link can be shared with its configuration baked in.
 */
export const settingsFromParams = (params: URLSearchParams): Settings => {
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of TEXT_FIELDS) {
    const value = params.get(key);
    if (value != null) {
      settings[key] = value;
    }
  }
  settings.inputMode = pick(
    params.get("input"),
    INPUT_MODES,
    DEFAULT_SETTINGS.inputMode,
  );
  settings.windowSize = pick(
    params.get("windowSize"),
    WINDOW_SIZES,
    DEFAULT_SETTINGS.windowSize,
  );
  settings.avatars = pick(params.get("avatars"), ["on", "off"], "on");
  settings.welcomeScreen = pick(
    params.get("welcomeScreen"),
    ["on", "off"],
    "on",
  );
  settings.avatarShape = pick(
    params.get("avatarShape"),
    ["round", "square"],
    "round",
  );
  return settings;
};

/** Trims every free-text field; the launch flow works off trimmed values. */
export const trimSettings = (settings: Settings): Settings => {
  const trimmed = { ...settings };
  for (const key of TEXT_FIELDS) {
    trimmed[key] = settings[key].trim();
  }
  return trimmed;
};

/**
 * Rewrites the current URL so the launched configuration survives a reload.
 * Non-default values are written; defaults and empty fields are dropped.
 */
export const writeSettingsToUrl = (settings: Settings): void => {
  const url = new URL(window.location.href);
  for (const key of TEXT_FIELDS) {
    if (settings[key] !== "") {
      url.searchParams.set(key, settings[key]);
    } else {
      url.searchParams.delete(key);
    }
  }
  const setOrDelete = (
    param: string,
    value: string,
    fallback: string,
  ): void => {
    if (value !== fallback) {
      url.searchParams.set(param, value);
    } else {
      url.searchParams.delete(param);
    }
  };
  setOrDelete("input", settings.inputMode, DEFAULT_SETTINGS.inputMode);
  setOrDelete("windowSize", settings.windowSize, DEFAULT_SETTINGS.windowSize);
  setOrDelete("avatars", settings.avatars, DEFAULT_SETTINGS.avatars);
  setOrDelete(
    "welcomeScreen",
    settings.welcomeScreen,
    DEFAULT_SETTINGS.welcomeScreen,
  );
  setOrDelete(
    "avatarShape",
    settings.avatarShape,
    DEFAULT_SETTINGS.avatarShape,
  );
  history.replaceState(null, "", url);
};

/** Whether the selected input mode places a voice call (voice or voice mini). */
export const isVoiceMode = (inputMode: Input): boolean =>
  inputMode === "voice" || inputMode === "voiceMini";

/** Whether Live Sync is configured: both ACXD keys are present. */
export const isLiveSyncConfigured = (settings: Settings): boolean =>
  settings.deploymentKey !== "" && settings.apiKey !== "";

/**
 * Validates the launch form. Returns the blocking problem, or `null` when the
 * configuration is good to go.
 */
export const validateSettings = (settings: Settings): string | null => {
  if (isVoiceMode(settings.inputMode) && settings.voiceEndpoint === "") {
    return "A StartWebRTCContact endpoint is required for voice modes.";
  }
  if (settings.inputMode === "text" && settings.endpoint === "") {
    return "A StartChatContact endpoint is required for chat.";
  }
  // External opens no contact of its own — it exists to ride Live Sync, so it
  // requires the ACXD deployment key + API key (and no endpoint).
  if (settings.inputMode === "external" && !isLiveSyncConfigured(settings)) {
    return "External mode requires the ACXD deployment key and API key (used for Live Sync).";
  }
  // For chat/voice, Live Sync is optional: if the deployment key + API key are
  // provided we connect Live Sync, otherwise it's plain chat/voice.
  return null;
};

/** Amazon Connect contact IDs are UUIDs. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
