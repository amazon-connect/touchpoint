import { useSyncExternalStore } from "react";
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

/**
 * The message bubble style the playground edits: a narrow, statically typed
 * subset of Touchpoint's `CustomStyle` with the three properties the editors
 * offer, all plain strings. Being a valid `CustomStyle` is checked where it
 * is handed to `create()` (see `useTouchpoint.ts`).
 */
export interface BubbleStyle {
  /** Text color. */
  color?: string;
  /** Bubble fill. */
  backgroundColor?: string;
  /** Corner rounding. */
  borderRadius?: string;
}

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
  /** Whether the surface's decorative depth layers are drawn. */
  backgroundDepthLayer: Toggle;
  /** Whether user messages are wrapped in a bubble. */
  userMessageBubble: Toggle;
  /** Whether assistant/agent messages are wrapped in a bubble. */
  agentMessageBubble: Toggle;
  /**
   * Inline style for the user message bubble, passed straight to Touchpoint.
   * `undefined` leaves the bubble with the library's own styling.
   */
  userMessageBubbleStyle?: BubbleStyle;
  /** Inline style for the assistant/agent message bubble, as above. */
  agentMessageBubbleStyle?: BubbleStyle;
};

/**
 * Seed for a bubble style, applied when its customization is switched on.
 * Colors are left out so the bubble keeps the theme's own until one is picked.
 */
export const DEFAULT_BUBBLE_STYLE: BubbleStyle = { borderRadius: "20px" };

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
  assistantName: "Assistant",
  assistantIcon: "",
  brandIcon: "",
  inputMode: "voiceMini",
  windowSize: "half",
  avatars: "on",
  welcomeScreen: "on",
  avatarShape: "round",
  backgroundDepthLayer: "on",
  userMessageBubble: "on",
  agentMessageBubble: "off",
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
  settings.backgroundDepthLayer = pick(
    params.get("backgroundDepthLayer"),
    ["on", "off"],
    DEFAULT_SETTINGS.backgroundDepthLayer,
  );
  settings.userMessageBubble = pick(
    params.get("userMessageBubble"),
    ["on", "off"],
    DEFAULT_SETTINGS.userMessageBubble,
  );
  settings.agentMessageBubble = pick(
    params.get("agentMessageBubble"),
    ["on", "off"],
    DEFAULT_SETTINGS.agentMessageBubble,
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
  setOrDelete(
    "backgroundDepthLayer",
    settings.backgroundDepthLayer,
    DEFAULT_SETTINGS.backgroundDepthLayer,
  );
  setOrDelete(
    "userMessageBubble",
    settings.userMessageBubble,
    DEFAULT_SETTINGS.userMessageBubble,
  );
  setOrDelete(
    "agentMessageBubble",
    settings.agentMessageBubble,
    DEFAULT_SETTINGS.agentMessageBubble,
  );
  history.replaceState(null, "", url);
};

/**
 * The customizations the design system's transcript example drives, pulled out
 * of a configuration so they can be compared against the defaults and restored
 * in one go.
 */
const transcriptCustomizations = (
  settings: Settings,
): Pick<
  Settings,
  | "userMessageBubble"
  | "agentMessageBubble"
  | "userMessageBubbleStyle"
  | "agentMessageBubbleStyle"
  | "avatars"
  | "assistantName"
  | "assistantIcon"
  | "backgroundDepthLayer"
> => ({
  userMessageBubble: settings.userMessageBubble,
  agentMessageBubble: settings.agentMessageBubble,
  userMessageBubbleStyle: settings.userMessageBubbleStyle,
  agentMessageBubbleStyle: settings.agentMessageBubbleStyle,
  avatars: settings.avatars,
  assistantName: settings.assistantName,
  assistantIcon: settings.assistantIcon,
  backgroundDepthLayer: settings.backgroundDepthLayer,
});

/** Whether any transcript customization differs from its default. */
export const hasTranscriptEdits = (settings: Settings): boolean =>
  JSON.stringify(transcriptCustomizations(settings)) !==
  JSON.stringify(transcriptCustomizations(DEFAULT_SETTINGS));

/** Puts every transcript customization back to its default. */
export const restoreTranscriptDefaults = (): void => {
  settingsStore.patch(transcriptCustomizations(DEFAULT_SETTINGS));
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

let current: Settings = settingsFromParams(
  new URLSearchParams(window.location.search),
);

const listeners = new Set<() => void>();

/**
 * Module-level store holding the single copy of the playground's
 * configuration. It lives outside React (rather than in a context) because the
 * design-system specimens render in their own React root inside a shadow DOM —
 * a context cannot cross that boundary, but a singleton subscribed to via
 * `useSyncExternalStore` can. That is what lets the transcript customizations
 * edited in the design system drive the mock chat frames and the launched
 * widget alike. Mirrors `customThemeStore` in `customTheme.ts`.
 */
export const settingsStore = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): Settings => current,
  /** Applies a partial update, as the launch form's fields do. */
  patch: (changes: Partial<Settings>): void => {
    current = { ...current, ...changes };
    for (const listener of listeners) {
      listener();
    }
  },
  /**
   * Updates one field, for callers that hold the field's key rather than a
   * literal patch (the design system's editors address fields by key).
   */
  set: <K extends keyof Settings>(key: K, value: Settings[K]): void => {
    current = { ...current, [key]: value };
    for (const listener of listeners) {
      listener();
    }
  },
  /** Replaces the whole configuration, e.g. with the trimmed settings. */
  replace: (next: Settings): void => {
    current = next;
    for (const listener of listeners) {
      listener();
    }
  },
};

/** Subscribes to the playground configuration. Safe across React roots. */
export const useSettings = (): Settings =>
  useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
