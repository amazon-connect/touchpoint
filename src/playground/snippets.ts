import type { ColorMode } from "../interface";
import {
  isLiveSyncConfigured,
  isVoiceMode,
  type Settings,
  UUID_RE,
} from "./settings";

const q = (value: string): string => JSON.stringify(value);

/** Inputs for {@link buildCreateSnippet}. */
interface CreateSnippetParams {
  /** The launched (trimmed) configuration. */
  settings: Settings;
  /** Color mode handed to the widget. */
  colorMode: ColorMode;
  /** Contact ID currently entered in the Live Sync section, if any. */
  contactId: string;
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
}: CreateSnippetParams): string => {
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
