import { type FC, useState } from "react";
import type { Input, WindowSize } from "../../interface";
import { renderInline } from "../inline";
import {
  type AvatarShape,
  type Settings,
  type TextFieldKey,
  type Toggle,
  isVoiceMode,
  trimSettings,
  validateSettings,
} from "../settings";
import { Button } from "../ui/Button";
import { GroupDivider, GroupTitle } from "../ui/Callout";
import { Field, FieldRow, Hint, MarkdownHint, TextInput } from "../ui/Field";
import { Disclosure, DisclosureFigure, DisclosureLead } from "../ui/Disclosure";
import { ON_OFF, Segmented, type SegmentedOption } from "../ui/Segmented";

const INPUT_MODES: SegmentedOption<Input>[] = [
  { value: "text", label: "Chat" },
  { value: "voice", label: "Voice" },
  { value: "voiceMini", label: "Voice mini" },
  { value: "external", label: "External" },
];

const WINDOW_SIZES: SegmentedOption<WindowSize>[] = [
  { value: "half", label: "Half screen" },
  { value: "full", label: "Fullscreen" },
  { value: "floating", label: "Floating" },
  { value: "side-by-side", label: "Side-by-side" },
];

const AVATAR_SHAPES: SegmentedOption<AvatarShape>[] = [
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
];

const CHAT_API_URL =
  "https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/cloudformationTemplates/startChatContactAPI";
const WEBRTC_API_URL =
  "https://github.com/amazon-connect/amazon-connect-in-app-calling-examples/tree/main/Backend/AmazonConnectNetraApiSample";
const CHAT_AUTH_BLOG_URL =
  "https://aws.amazon.com/blogs/contact-center/how-to-authenticate-customers-during-chat-with-amazon-connect-customer/";

/**
 * The launch form. Only the fields relevant to the selected input mode are
 * shown: the chat endpoint (and optional chat auth) for text, the WebRTC
 * endpoint for voice, and neither for external — which rides Live Sync only.
 */
export const ConfigScreen: FC<{
  /** Current form state. */
  settings: Settings;
  /** Applies a partial update to the form state. */
  onChange: (patch: Partial<Settings>) => void;
  /** Called with the trimmed settings once they validate. */
  onLaunch: (settings: Settings) => void;
}> = ({ settings, onChange, onLaunch }) => {
  const [error, setError] = useState<string | null>(null);
  const { inputMode } = settings;
  const isChat = inputMode === "text";
  const showLayout = inputMode === "text" || inputMode === "voice";
  const showBranding = inputMode !== "external";
  const showAvatarOptions = isChat && settings.avatars === "on";

  const text = (
    key: TextFieldKey,
  ): {
    id: string;
    value: string;
    onChange: (event: { target: { value: string } }) => void;
  } => ({
    id: key,
    value: settings[key],
    onChange: (event) => {
      onChange({ [key]: event.target.value });
    },
  });

  const launch = (): void => {
    const trimmed = trimSettings(settings);
    const problem = validateSettings(trimmed);
    setError(problem);
    if (problem == null) {
      onLaunch(trimmed);
    }
  };

  return (
    <>
      <header>
        <h1 className="mb-2 text-[26px] font-bold tracking-[-0.01em] text-heading md:text-[32px]">
          Playground
        </h1>
        <p className="max-w-[60ch] text-muted">
          Enter your Amazon Connect Customer and Agentic CX designer (ACXD)
          details to launch the interactive playground.
        </p>
      </header>

      <section>
        <GroupTitle>User Experience</GroupTitle>

        <Field
          label="Input mode"
          tip="How the customer interacts: text Chat, full-screen Voice, a compact Voice mini widget, or External – through a contact external to this website, such as a phone call. All modes support Live Sync."
        >
          <Segmented
            label="Input mode"
            value={inputMode}
            options={INPUT_MODES}
            onChange={(value) => {
              onChange({ inputMode: value });
            }}
          />
        </Field>
        {inputMode === "external" && (
          <Hint>
            External shows no UI — use it to synchronize your digital asset
            using Live Sync to an existing live contact (using its contact ID)
            and drive everything from the external Connect Customer contact. A
            good example of this is through a phone call.
          </Hint>
        )}

        {/* Layout applies to Chat and full-screen Voice, not Voice mini. */}
        {showLayout && (
          <Field
            label="Layout"
            tip="How the expanded experience is presented. Half & Fullscreen overlay the page (dimmed). Floating and Side-by-side leave the page visible and interactive — ideal for chatting while browsing. Voice mini ignores this and stays a compact floating widget."
            hint="Floating hovers a rounded panel over the page; Side-by-side docks to the right edge and narrows the page so both stay usable. Voice mini ignores this and stays a compact floating widget."
          >
            <Segmented
              label="Layout"
              value={settings.windowSize}
              options={WINDOW_SIZES}
              onChange={(value) => {
                onChange({ windowSize: value });
              }}
            />
          </Field>
        )}

        {/* Brand logo shown in the header (and optionally the welcome screen). */}
        {showBranding && (
          <Field
            label="Logo (brand icon) URL"
            htmlFor="brandIcon"
            tip="Image URL shown as the brand logo in the header. Also used at the top of the welcome screen when 'Welcome logo' is on."
          >
            <TextInput
              {...text("brandIcon")}
              type="text"
              placeholder="https://example.com/logo.png"
            />
          </Field>
        )}

        {/* Immersive welcome screen — chat only. */}
        {isChat && (
          <Field
            label="Welcome screen"
            tip="Show the opening message (and any choices) centered vertically until the customer responds, with the connecting/thinking state centered too. Turn off to render a top-anchored transcript from the first message."
          >
            <Segmented
              label="Welcome screen"
              value={settings.welcomeScreen}
              options={ON_OFF}
              onChange={(value: Toggle) => {
                onChange({ welcomeScreen: value });
              }}
            />
          </Field>
        )}

        {/* Avatars (participant info) — chat transcript only. */}
        {isChat && (
          <Field
            label="Avatars"
            tip="Show each participant's avatar and name (You / the assistant / Agent) beside messages in the chat transcript. Turn off for a bare transcript."
          >
            <Segmented
              label="Avatars"
              value={settings.avatars}
              options={ON_OFF}
              onChange={(value: Toggle) => {
                onChange({ avatars: value });
              }}
            />
          </Field>
        )}

        {/* Assistant identity (name + icon) applies to chat with avatars on. */}
        {showAvatarOptions && (
          <FieldRow>
            <Field
              label="Assistant name"
              htmlFor="assistantName"
              tip="Name shown for the automated assistant, replacing the default 'AI'. Visible when Avatars are on."
            >
              <TextInput
                {...text("assistantName")}
                type="text"
                placeholder="AI"
              />
            </Field>
            <Field
              label="Assistant icon URL"
              htmlFor="assistantIcon"
              tip="Image URL used as the assistant's avatar, replacing the default icon. Visible when Avatars are on."
            >
              <TextInput
                {...text("assistantIcon")}
                type="text"
                placeholder="https://example.com/icon.png"
              />
            </Field>
            <Field
              label="Avatar shape"
              tip="Whether participant avatars are fully round or square (with the inner border radius)."
            >
              <Segmented
                label="Avatar shape"
                value={settings.avatarShape}
                options={AVATAR_SHAPES}
                onChange={(value) => {
                  onChange({ avatarShape: value });
                }}
              />
            </Field>
          </FieldRow>
        )}

        {/* Customer/participant display name, sent to Connect for all modes. */}
        <Field
          label="Customer name"
          htmlFor="displayName"
          tip="Name shown for the customer/participant in the conversation (sent to Amazon Connect)."
        >
          <TextInput {...text("displayName")} type="text" />
        </Field>

        <GroupDivider />
        <GroupTitle>Integration</GroupTitle>

        {/* Chat-only fields (StartChatContact + chat auth). External needs no endpoint. */}
        {isChat && (
          <>
            <Field
              label="StartChatContact Endpoint URL (chat)"
              htmlFor="endpoint"
              tip="Your API Gateway/Lambda endpoint that calls Amazon Connect Customer StartChatContact and returns the participant credentials. Required for Chat."
            >
              <TextInput
                {...text("endpoint")}
                type="text"
                placeholder="https://abc123.execute-api.us-east-1.amazonaws.com/prod"
              />
            </Field>
            <MarkdownHint
              text={`Need one? [Set up the StartChatContact API →](${CHAT_API_URL})`}
            />

            <Field
              label="Authentication Endpoint URL (chat auth, optional)"
              htmlFor="authEndpoint"
              tip="Optional. Backend endpoint that completes chat authentication by calling connect:UpdateParticipantAuthentication (an admin API that can't be called from the browser). Only needed when your flow uses the Authenticate Customer block."
            >
              <TextInput
                {...text("authEndpoint")}
                type="text"
                placeholder="https://def456.execute-api.us-east-1.amazonaws.com/prod"
              />
            </Field>
            <MarkdownHint
              text={`Optional — only for flows using the Authenticate Customer block. Read more about [how to authenticate customers during chat →](${CHAT_AUTH_BLOG_URL}).`}
            />
          </>
        )}

        {/* Voice-only field (StartWebRTCContact). */}
        {isVoiceMode(inputMode) && (
          <>
            <Field
              label="StartWebRTCContact Endpoint URL (voice)"
              htmlFor="voiceEndpoint"
              tip="Your endpoint that calls Amazon Connect Customer StartWebRTCContact and returns the Chime connection data. Required for Voice and Voice mini."
            >
              <TextInput
                {...text("voiceEndpoint")}
                type="text"
                placeholder="https://xyz789.execute-api.us-east-1.amazonaws.com/prod"
              />
            </Field>
            <MarkdownHint
              text={`Need one? [Set up the StartWebRTCContact endpoint →](${WEBRTC_API_URL})`}
            />
          </>
        )}

        <FieldRow>
          <Field
            label="Instance ID"
            htmlFor="instanceId"
            tip="The Amazon Connect Customer instance (UUID) the contact is created in."
          >
            <TextInput
              {...text("instanceId")}
              type="text"
              placeholder="11111111-1111-1111-1111-111111111111"
            />
          </Field>
          <Field
            label="Contact Flow ID"
            htmlFor="contactFlowId"
            tip="The Amazon Connect Customer contact flow (UUID) that handles the contact."
          >
            <TextInput
              {...text("contactFlowId")}
              type="text"
              placeholder="22222222-2222-2222-2222-222222222222"
            />
          </Field>
        </FieldRow>

        <Field
          label="Region"
          htmlFor="region"
          tip="AWS region of your Amazon Connect Customer instance, e.g. us-west-2."
        >
          <TextInput {...text("region")} type="text" />
        </Field>

        <Field
          label="ACXD application deployment key"
          htmlFor="deploymentKey"
          tip="The deployment key of your ACXD application, found under the settings section of your application."
        >
          <TextInput {...text("deploymentKey")} type="text" />
        </Field>

        <Field
          label="ACXD application API key"
          htmlFor="apiKey"
          tip="Authenticates your ACXD and Live Sync related requests, found under the settings section of your ACXD application."
        >
          <TextInput {...text("apiKey")} type="text" />
        </Field>

        <Disclosure
          className="mt-6"
          summary="New here? Set up Amazon Connect Customer and ACXD"
        >
          <DisclosureLead>
            You&apos;ll need an ACXD application with a Live Sync flow, and an
            Amazon Connect Customer instance that routes contacts into it.
          </DisclosureLead>
          <ol className="mb-4">
            <li>
              {renderInline(
                "**Build the ACXD application.** In the ACXD Canvas, wire `Start` → a **Live Sync** node → `Exit application`. On the Live Sync node, declare the actions and scopes the assistant may use (or define them on the fly with this SDK for rapid prototyping).",
              )}
            </li>
            <li>
              {renderInline(
                "**Publish it and copy your keys.** Deploy the application, then from its settings copy the **deployment key** and **API key** into the fields above.",
              )}
            </li>
            <li>
              {renderInline(
                "**Point Amazon Connect at it.** In your Amazon Connect Customer instance, create a contact flow that hands the contact to your ACXD application; note the **instance ID** and **contact flow ID**.",
              )}
            </li>
            <li>
              {renderInline(
                `**Stand up the browser endpoints** so the page can create a contact: [StartChatContact (chat)](${CHAT_API_URL}) and [StartWebRTCContact (voice)](${WEBRTC_API_URL}).`,
              )}
            </li>
          </ol>
          <DisclosureFigure
            src="./livesync-acxd-canvas.png"
            alt="A Live Sync node in the ACXD Canvas: Start → Live Sync (with actions) → Exit application."
            caption="A Live Sync node in the ACXD Canvas."
          />
        </Disclosure>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {error != null && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <Button variant="primary" onClick={launch}>
            Launch playground
          </Button>
        </div>
      </section>
    </>
  );
};
