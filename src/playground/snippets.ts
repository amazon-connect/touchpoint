import type { ColorMode } from "../interface";
import type { EditableThemeKey, ThemeOverrides } from "./customTheme";
import {
  type BubbleStyle,
  isLiveSyncConfigured,
  isVoiceMode,
  type Settings,
  UUID_RE,
} from "./settings";

/** Renders a bubble style object as the lines of a `create()` option. */
const styleLines = (
  option: string,
  style: BubbleStyle | undefined,
): string[] =>
  style == null
    ? []
    : [
        `  ${option}: {`,
        ...Object.entries(style).map(
          ([key, value]) => `    ${key}: ${q(value)},`,
        ),
        "  },",
      ];

const q = (value: string): string => JSON.stringify(value);

/** Inputs for {@link buildCreateSnippet}. */
interface CreateSnippetParams {
  /** The launched (trimmed) configuration. */
  settings: Settings;
  /** Color mode handed to the widget. */
  colorMode: ColorMode;
  /** Contact ID currently entered in the Live Sync section, if any. */
  contactId: string;
  /** Custom theme overrides set in the design system, if any. */
  theme: ThemeOverrides;
}

/**
 * Regenerates the `create()` snippet from the launched configuration, surfacing
 * only the parameters that apply to the selected input mode:
 *
 * - `text`: StartChatContact (+ optional chat auth), instance/flow, window size
 * - `voice` / `voiceMini`: StartWebRTCContact, instance/flow (window size for voice)
 * - `external`: no endpoints or instance/flow — Live Sync only
 */
export const buildCreateSnippet = ({
  settings,
  colorMode,
  contactId,
  theme,
}: CreateSnippetParams): string => {
  const themeEntries = Object.entries(theme);
  const { inputMode, windowSize, avatars, welcomeScreen, avatarShape } =
    settings;
  const isText = inputMode === "text";
  const isVoice = isVoiceMode(inputMode);
  const isExternal = inputMode === "external";
  const showWindowSize = inputMode === "text" || inputMode === "voice";
  const withAvatars = isText && avatars === "on";
  // Live Sync is required for external, and optional (shown when keyed) otherwise.
  const showLiveSync = isLiveSyncConfigured(settings);
  const validContactId = contactId !== "" && UUID_RE.test(contactId);

  return [
    'import { create } from "@amazon-connect-touchpoint/web";',
    "",
    "const touchpoint = await create({",
    "  config: {",
    isText && settings.endpoint !== ""
      ? `    chatEndpoint: ${q(settings.endpoint)},`
      : null,
    isVoice && settings.voiceEndpoint !== ""
      ? `    voiceEndpoint: ${q(settings.voiceEndpoint)},`
      : null,
    isText && settings.authEndpoint !== ""
      ? `    authenticationEndpoint: ${q(settings.authEndpoint)},`
      : null,
    !isExternal ? `    instanceId: ${q(settings.instanceId)},` : null,
    !isExternal ? `    contactFlowId: ${q(settings.contactFlowId)},` : null,
    `    region: ${q(settings.region === "" ? "us-west-2" : settings.region)},`,
    settings.stage !== "" ? `    stage: ${q(settings.stage)},` : null,
    "  },",
    `  input: ${q(inputMode)},`,
    `  colorMode: ${q(colorMode)},`,
    showWindowSize ? `  windowSize: ${q(windowSize)},` : null,
    settings.brandIcon !== "" ? `  brandIcon: ${q(settings.brandIcon)},` : null,
    isText ? `  showParticipantInfo: ${avatars === "on"},` : null,
    withAvatars && settings.assistantName !== ""
      ? `  assistantName: ${q(settings.assistantName)},`
      : null,
    withAvatars && settings.assistantIcon !== ""
      ? `  assistantIcon: ${q(settings.assistantIcon)},`
      : null,
    withAvatars && avatarShape !== "round"
      ? `  avatarShape: ${q(avatarShape)},`
      : null,
    isText && welcomeScreen === "off" ? "  welcomeScreen: false," : null,
    settings.backgroundDepthLayer === "off"
      ? "  backgroundDepthLayer: false,"
      : null,
    isText
      ? `  userMessageBubble: ${settings.userMessageBubble === "on"},`
      : null,
    isText
      ? `  agentMessageBubble: ${settings.agentMessageBubble === "on"},`
      : null,
    ...(isText
      ? styleLines("userMessageBubbleStyle", settings.userMessageBubbleStyle)
      : []),
    ...(isText
      ? styleLines("agentMessageBubbleStyle", settings.agentMessageBubbleStyle)
      : []),
    ...(themeEntries.length > 0
      ? [
          "  theme: {",
          ...themeEntries.map(([key, value]) => `    ${key}: ${q(value)},`),
          "  },",
        ]
      : []),
    showLiveSync ? "  liveSync: {" : null,
    showLiveSync ? `    deploymentKey: ${q(settings.deploymentKey)},` : null,
    showLiveSync ? `    apiKey: ${q(settings.apiKey)},` : null,
    showLiveSync
      ? validContactId
        ? `    contactId: ${q(contactId)},`
        : '    // contactId: "…", // a contact UUID, e.g. a phone call'
      : null,
    showLiveSync ? "  }," : null,
    "});",
    showLiveSync ? "" : null,
    showLiveSync ? "// Sent once the session has a contact ID:" : null,
    showLiveSync ? "await touchpoint.sendContext({" : null,
    showLiveSync ? '  scopes: ["booking"],' : null,
    showLiveSync
      ? "  actions: [ /* custom actions, incl. `navigate`, shown per example below */ ],"
      : null,
    showLiveSync ? "});" : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
};

/*
  The design system's configuration entries each show how to reproduce the
  customization they edit. They are fragments of a `create()` call rather than a
  complete one: only the fields the gallery configures are emitted (everything
  in Touchpoint has a default, so an unset field is simply left out), with a
  note standing in for the configuration every integration needs anyway.
*/

const CREATE_NOTE = [
  "  // Plus the configuration every integration needs: `config` with your",
  "  // endpoints, `instanceId` and `contactFlowId`, `input`, `windowSize`, …",
  "  // (the launch screen's snippet shows a complete call).",
];

/** Wraps emitted option lines in the import and the `create()` call. */
const createFragment = (lines: string[]): string =>
  [
    'import { create } from "@amazon-connect-touchpoint/web";',
    "",
    "const touchpoint = await create({",
    ...CREATE_NOTE,
    ...lines,
    "});",
  ].join("\n");

/**
 * The `create()` fragment for a group of theme overrides (the design system's
 * General and Colors entries). Keys left at their default are omitted, and the
 * `theme` option disappears entirely when the group is untouched.
 */
export const buildThemeSnippet = (
  overrides: ThemeOverrides,
  keys: EditableThemeKey[],
): string => {
  const set = keys.filter((key) => overrides[key] != null);
  return createFragment(
    set.length === 0
      ? []
      : [
          "  theme: {",
          ...set.map((key) => `    ${key}: ${q(overrides[key] as string)},`),
          "  },",
        ],
  );
};

/**
 * The `create()` fragment for the transcript customizations (the design
 * system's Chat transcript entry). Each option is emitted only where it
 * differs from Touchpoint's own default, so the snippet is exactly what the
 * current preview needs.
 */
export const buildTranscriptSnippet = (settings: Settings): string => {
  const withAvatars = settings.avatars === "on";
  return createFragment(
    [
      // Defaults: user bubbles on, agent bubbles off.
      settings.userMessageBubble === "off"
        ? "  userMessageBubble: false,"
        : null,
      settings.agentMessageBubble === "on"
        ? "  agentMessageBubble: true,"
        : null,
      ...styleLines("userMessageBubbleStyle", settings.userMessageBubbleStyle),
      ...styleLines(
        "agentMessageBubbleStyle",
        settings.agentMessageBubbleStyle,
      ),
      // Participant info is off by default; its fields only apply when it is on.
      withAvatars ? "  showParticipantInfo: true," : null,
      withAvatars && settings.assistantName !== ""
        ? `  assistantName: ${q(settings.assistantName)},`
        : null,
      withAvatars && settings.assistantIcon !== ""
        ? `  assistantIcon: ${q(settings.assistantIcon)},`
        : null,
      withAvatars && settings.avatarShape !== "round"
        ? `  avatarShape: ${q(settings.avatarShape)},`
        : null,
      // The depth layers are drawn by default.
      settings.backgroundDepthLayer === "off"
        ? "  backgroundDepthLayer: false,"
        : null,
    ].filter((line): line is string => line !== null),
  );
};

/** Keeps the `sendStep` snippet in sync with the script-step inputs above it. */
export const buildStepSnippet = (step: {
  /** Step to fire. */
  stepId: string;
  /** Live Sync script id. */
  scriptId: string;
  /** Script-specific API key. */
  apiKey: string;
}): string => {
  const or = (value: string, fallback: string): string =>
    q(value.trim() === "" ? fallback : value.trim());
  return [
    "await touchpoint.sendStep({",
    `  stepId: ${or(step.stepId, "YOUR_STEP_ID")},`,
    `  scriptId: ${or(step.scriptId, "YOUR_SCRIPT_ID")},`,
    `  apiKey: ${or(step.apiKey, "YOUR_SCRIPT_API_KEY")},`,
    "  context: {",
    "    // optional context to carry back to the script",
    "    flight: document.querySelector('input[name=\"flight\"]:checked')?.value,",
    "  },",
    "});",
  ].join("\n");
};
