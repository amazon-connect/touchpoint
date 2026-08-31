import type { ApplicationMessage, Context } from "@nlxai/core";
import { type ComponentType } from "react";
import type { InteractiveElementInfo } from "./liveSync/analyzePageForms";
import type {
  AuthenticationStatus,
  ConnectConfig,
  ConnectConversationHandler,
} from "./connect";

export type {
  AuthenticationStatus,
  ConnectConfig,
  ConnectConversationHandler,
  ChatDetails,
  DetailsRequestParams,
} from "./connect";

/**
 * Presentation layout for the expanded experience.
 *
 * - `half`: overlay covering the viewport with the panel on the right and the
 *   rest of the page dimmed. The default.
 * - `full`: overlay covering the whole viewport.
 * - `floating`: a detached, rounded panel that hovers over the page without
 *   dimming it, so the website stays visible and interactive.
 * - `side-by-side`: a panel docked to the right edge for the full height; the
 *   page is narrowed by the panel's width (on wider viewports) so nothing is
 *   hidden behind it and both can be used at once.
 *
 * `floating` and `side-by-side` are ideal for chatting while browsing (e.g. Live
 * Sync over chat), the way `voice` conversations already run alongside the page.
 * @inline @hidden
 */
export type WindowSize = "half" | "full" | "floating" | "side-by-side";

/**
 * Color mode configuration (light/dark modes)
 * @inline @hidden
 */
export type ColorMode = "light" | "dark" | "light dark";

/**
 * Choice message with metadata
 * @internal
 */
export interface ChoiceMessage {
  /**
   * Message contents
   */
  message: ApplicationMessage;
  /**
   * Index in the response transcript history
   */
  responseIndex: number;
  /**
   * Message index in the current response
   */
  messageIndex: number;
}

/**
 * Custom Modalities allow rendering of rich user interfaces directly inside a conversation.
 * A custom modality component is a React component. It will receive the modality data as a
 * `data` prop, along with the conversation handler instance to interact with the conversation as
 * `conversationHandler` prop.
 * @category Modality components
 * @typeParam Data - The type of the modality being rendered by this component.
 */
export type CustomModalityComponent<Data> = ComponentType<{
  /**
   * The payload of the Custom Modality. The schema is defined in Dialog Studio settings.
   */
  data: Data;
  /**
   * Conversation handler instance
   */
  conversationHandler: ConnectConversationHandler;

  /**
   * Whether the component is enabled
   * We should probably use context and handle disabling interactive components automatically for the user
   * @internal
   */
  enabled: boolean;
  /**
   * Class name to propagate to the container
   */
  className?: string;

  /**
   * Tells the component whether it is rendered as an overlay over other elements. In this case, the class `backdrop-blur-overlay` is required
   * on transparent elements in order to make sure its contents remain visible.
   */
  renderedAsOverlay?: boolean;
}>;

/**
 * Custom conversation init method. Defaults to a no-op: Amazon Connect drives
 * the greeting from the contact flow when the participant connects.
 * @param handler - the conversation handler.
 * @param context - context set via TouchpointConfiguration.initialContext
 * @inline @hidden
 */
export type InitializeConversation = (
  handler: ConnectConversationHandler,
  context?: Context,
) => void;

/**
 * Fully custom launch icon
 * @inline @hidden
 */
export type CustomLaunchButton = ComponentType<{
  /**
   * Class name injected into the component mainly to take care of positioning and z-index. Can be combined with more presentational and sizing-related class names.
   */
  className?: string;
  /**
   * Click handler that expands Touchpoint, without the caller having to implement this based on Touchpoint instance methods.
   */
  onClick?: () => void;
}>;

/**
 * Input type for the experience
 * @inline @hidden
 */
export type Input = "text" | "voice" | "voiceMini" | "external";

/**
 * Input field value
 * @inline @hidden
 */
export interface InputField {
  /**
   * Field ID
   */
  id: string;
  /**
   * Field value
   */
  value: string | boolean;
}

/**
 * Internal state that the automatic context maintains.
 * @category Live Sync
 */
export interface PageState {
  /** Mapping from form element IDs to their DOM elements */
  formElements: Record<string, Element>;
  /** Mapping from link element names to their URLs */
  links: Record<string, string>;
  /** Mapping from custom actions to their handlers */
  customActions: Map<string, (arg: any) => void>;
}

/**
 * LiveSync context information that is sent to the LLM.
 * @category Live Sync
 */
export interface LiveSyncContext {
  /** Identifier for which page you are currently on. This can be used to filter the relevant KB pages. */
  uri?: string;
  /**
   * The active form fields, provided by the app (deterministically or via its own page
   * inspection). Used in conjunction with the Live Sync node's "input" action type.
   */
  fields?: InteractiveElementInfo[];
  /**
   * Scope tags describing the current application scope/state, so the agent knows which of
   * its Live Sync-node tools and actions are available at this point in the journey (e.g.
   * narrowing 20 tools / 12 actions down to the few relevant here).
   */
  scopes?: string[];
  /** Human readable location names that can be navigated to. */
  destinations?: string[];
  /**
   * Custom actions that can be performed.
   */
  actions?: Array<{
    /** The name of the action, used to invoke it. */
    action: string;
    /** A short description of the action */
    description?: string;
    /** A schema for validating the action's input. Should follow the JSON Schema specification. */
    schema?: any;
  }>;
}

/**
 * Explicit Live Sync context passed to {@link TouchpointInstance.sendContext}. Actions,
 * scopes, and fields can be provided together or independently.
 * @category Live Sync
 */
export interface LiveSyncContextInput {
  /** Custom actions the assistant may invoke (handlers are registered, definitions sent). */
  actions?: LiveSyncCustomAction[];
  /** Scope tags for the current application scope/state. */
  scopes?: string[];
  /** Form fields the app exposes for the Live Sync "input" action. */
  fields?: InteractiveElementInfo[];
  /**
   * Human-readable destination names the assistant may navigate to (via a `page_custom`
   * navigation action). Without these the assistant has no idea what targets exist.
   */
  destinations?: string[];
}

/**
 * Connection details for the Live Sync action socket. Providing these enables
 * Live Sync: Touchpoint opens the socket and lets the assistant drive the page.
 * @category Live Sync
 */
export interface LiveSyncConnection {
  /** Deployment key for the Live Sync socket. */
  deploymentKey: string;
  /** API key for the Live Sync socket. */
  apiKey: string;
  /**
   * Amazon Connect contact ID; sent as `conversationId` on the wire. Optional — when
   * omitted, Live Sync uses the contact ID from the active chat/voice session (from
   * StartChatContact / StartWebRTCContact), enabling Live Sync collocated with the page.
   *
   * Set it explicitly to synchronize a separate contact — most commonly an inbound
   * **phone call** — to the webpage Touchpoint is installed on, so the caller's voice
   * conversation can drive this page (pass the phone call's contact ID here).
   */
  contactId?: string;
}

/**
 * Parameters for {@link TouchpointInstance.sendStep}. Script steps authenticate separately
 * from the deployment-key context channel (the Voice+ Track API), so each call carries its
 * own workspace, script, and key — they are not part of the Live Sync config.
 * @category Live Sync
 */
export interface SendStepParams {
  /** The Live Sync script step identifier. */
  stepId: string;
  /** Script / journey ID (sent as `journeyId` in the body). */
  scriptId: string;
  /** Script-specific Live Sync API key (sent as the `nlx-api-key` header). */
  apiKey: string;
  /** Optional context data to attach to the step. */
  context?: Record<string, unknown>;
}

/**
 * Configuration for Live Sync: the connection details, plus how the assistant
 * may drive the page (navigation, form filling, custom actions).
 * @category Live Sync
 */
export type LiveSyncConfig = LiveSyncConnection &
  (
    | {
        /**
         * Attempt to gather and send page context automatically. This will work well on semantically coded pages without too many custom form controls.
         * This enables a number of automatic features.
         *
         * Defaults to `true`.
         */
        automaticContext?: true;

        /**
         * Navigation handler for liveSync mode.
         *
         * The default implementation will navigate to those pages using standard `window.location` APIs.
         * @param action - The navigation action to perform.
         * @param destination - The name of the destination to navigate to if `action` is `"page_custom"`.
         * @param destinations - A map of destination names to URLs for custom navigation.
         */
        navigation?: (
          action:
            "page_next" | "page_previous" | "page_custom" | "page_unknown",
          destination: string | undefined,
          destinations: Record<string, string>,
        ) => void;

        /**
         * A callback for filling out form fields in liveSync mode.
         *
         * The default implementation will fill out the form fields using standard DOM APIs.
         * @param fields - An array of field objects with `id` and `value` properties.
         * @param pageFields - A map of field IDs to DOM elements for custom form filling.
         */
        input?: (
          fields: InputField[],
          pageFields: Record<string, Element>,
        ) => void;

        /**
         * A callback for custom actions in liveSync mode.
         * @param action - The custom name of your action.
         * @param payload - The payload defined for the custom action.
         * @deprecated Use {@link TouchpointInstance.setCustomLiveSyncActions} instead.
         * @returns
         */
        custom?: (action: string, payload: unknown) => void;

        /**
         * A callback for customizing the automatic context gathering.
         *
         * This allows you to modify the context and state before they are sent to the LLM.
         * @returns The modified context and state. If the state is identical to the previous state, the call to the server will be skipped.
         */
        customizeAutomaticContext?: (arg: {
          context: LiveSyncContext;
          state: PageState;
        }) => {
          /**
           * The current context being sent to the LLM
           */
          context: LiveSyncContext;
          /**
           * The current state of the page - this is stuff not sent to the LLM, but needed to connect the results back to actions to take on the page.
           */
          state: PageState;
        };
      }
    | {
        /**
         * Disable gathering page context automatically.
         */
        automaticContext: false;

        /**
         * Navigation handler for liveSync mode. Without automatic context there is no default implementation.
         * @param action - The navigation action to perform.
         * @param destination - The name of the destination to navigate to if `action` is `"page_custom"`.
         */
        navigation?: (
          action:
            "page_next" | "page_previous" | "page_custom" | "page_unknown",
          destination?: string,
        ) => void;
        /**
         * A callback for filling out form fields in liveSync mode.  Without automatic context there is no default implementation.
         * @param fields - An array of field objects with `id` and `value` properties.
         */
        input?: (fields: InputField[]) => void;
        /**
         * A callback for custom actions in liveSync mode.
         * @param action - The custom name of your action.
         * @param payload - The payload defined for the custom action.
         */
        custom?: (action: string, payload: unknown) => void;
      }
  );

/**
 * Main Touchpoint creation properties object
 * @category Basics
 */
export interface TouchpointConfiguration {
  /**
   * Amazon Connect Chat connection details. Touchpoint builds the conversation
   * from these — there is no separate adapter to wire up.
   */
  config: ConnectConfig;
  /**
   * BCP-47 language code used for built-in UI copy. Defaults to `en-US`.
   */
  languageCode?: string;
  /**
   * When `true`, each message shows the participant's avatar and name
   * (You / the assistant name / Agent). Defaults to `false` (bare transcript).
   */
  showParticipantInfo?: boolean;
  /**
   * Display name for the automated assistant, shown when `showParticipantInfo`
   * is enabled. Defaults to `AI`.
   */
  assistantName?: string;
  /**
   * URL of an image used as the assistant's avatar when `showParticipantInfo` is
   * enabled. Defaults to a generic assistant icon.
   */
  assistantIcon?: string;
  /**
   * Shape of participant avatars when `showParticipantInfo` is enabled: fully
   * round, or a lightly-rounded square. Defaults to `round`.
   */
  avatarShape?: "round" | "square";
  /**
   * Message sent when the user picks "Talk to the agent" from the settings menu.
   * Amazon Connect has no client-side escalation API, so this text is sent to the
   * contact flow, which decides how to route to a human. Defaults to
   * `"I'd like to talk to an agent"`.
   */
  escalationPhrase?: string;
  /**
   * Presentation layout for the expanded experience, defaults to `half`.
   *
   * - `half`: overlay with the panel on the right and the rest of the page dimmed.
   * - `full`: overlay covering the whole viewport.
   * - `floating`: a detached, rounded panel hovering over the page without dimming
   *   it, so the site stays visible and interactive.
   * - `side-by-side`: a panel docked to the right edge for the full height; on
   *   wider viewports the page is narrowed by the panel's width so both can be
   *   used at once.
   *
   * Applies to chat and full-screen voice; `voiceMini` is always a compact
   * floating widget.
   */
  windowSize?: WindowSize;
  /**
   * Optional color mode for the chat window, defaults to `dark`. Setting `light dark` enables automatic switching based on system settings.
   */
  colorMode?: ColorMode;
  /**
   * URL of icon used to display the brand in the chat header
   */
  brandIcon?: string;
  /**
   * Include border animation. Currently only supported in Voice Mini.
   */
  animate?: boolean;
  /**
   * URL of icon used on the launch icon in the bottom right when the experience is collapsed.
   *
   * When set to `false`, no launch button is shown at all. When not set or set to `true`, the default launch icon is rendered.
   */
  launchIcon?: string | boolean | CustomLaunchButton;
  /**
   * Specifies whether the user message has bubbles or not
   */
  userMessageBubble?: boolean;
  /**
   * Specifies whether the agent message has bubbles or not
   */
  agentMessageBubble?: boolean;
  /**
   * Enables chat mode, a classic chat experience with inline loaders and the chat history visible at all times.
   */
  chatMode?: boolean;
  /**
   * Whether the immersive welcome screen is shown for a text conversation: the
   * opening assistant message (and any choices) centered vertically, and the
   * connecting/thinking state centered where the message will appear, until the
   * customer sends or selects something. Defaults to `true`. Set to `false` to
   * render the conversation as a top-anchored transcript from the first message.
   * Has no effect once modalities/guides are present or the conversation has
   * progressed.
   */
  welcomeScreen?: boolean;
  /**
   * Whether to show the brand logo ({@link TouchpointConfiguration.brandIcon}) at
   * the top of the welcome screen. Defaults to `true`; has no effect when no
   * `brandIcon` is set or the welcome screen is disabled.
   */
  welcomeScreenLogo?: boolean;
  /**
   * Optional theme object to override default theme values
   */
  theme?: Partial<Theme>;
  /**
   * Optional {@link CustomModalityComponent | custom modality components} to render in Touchpoint
   */
  modalityComponents?: Record<string, CustomModalityComponent<unknown>>;
  /**
   * Optional custom modality components to render in Touchpoint
   * @deprecated use {@link TouchpointConfiguration.modalityComponents} instead.
   * @hidden
   */
  customModalities?: Record<string, CustomModalityComponent<unknown>>;
  /**
   * Custom conversation init method. Defaults to sending the welcome flow.
   * @param handler - the conversation handler.
   * @param context - the context object
   */
  initializeConversation?: InitializeConversation;
  /**
   * Called when the underlying Amazon Connect contact ends — the voice call is
   * disconnected (including after an escalated agent resolves and hangs up) or
   * the chat contact is closed.
   *
   * The event is cancelable. For voice inputs the default action collapses the
   * widget back to the launcher; call `event.preventDefault()` to keep it open
   * and handle the end yourself. Chat has no default action — the ended
   * transcript stays visible — so use this hook to collapse, navigate, or log as
   * needed (e.g. `touchpoint.expanded = false`).
   * @param event - a cancelable event; call `preventDefault()` to skip the default action.
   */
  onContactEnded?: (event: Event) => void;
  /**
   * Controls the ways in which  the user can communicate with the application. Defaults to `"text"`
   */
  input?: Input;
  /**
   * Sets whether the transcript is shown in `voice` and `voiceMini` inputs.
   */
  showVoiceTranscript?: boolean;
  /**
   * Context sent with the initial request.
   */
  initialContext?: Context;
  /**
   * Enables liveSync mode of Live Sync. Will automatically set the liveSync flag in the config.
   *
   */
  liveSync?: LiveSyncConfig;
  /**
   * Copy
   */
  copy?: Partial<Copy>;
}

/**
 * The full theme expressed as CSS custom properties.
 * This means that for instance colors can be made to switch automatically based on the system color mode by using the `light-dark()` CSS function.
 * Note also that not all colors need to be provided manually. For instance if only `primary` is provided, the rest of the primary colors will be computed automatically based on it.
 * Therefore, for a fully custom but minimal theme, you only need to provide `accent`, `primary`, `secondary`, `background`, `overlay`, and potentially the warning and error colors.
 * @example
 * ```typescript
 * const theme : Partial<Theme> = {
 *   primary: "light-dark(rgb(0, 2, 9), rgb(255, 255, 255))",
 *   secondary: "light-dark(rgb(255, 255, 255), rgb(0, 2, 9))",
 *   accent: "light-dark(rgb(28, 99, 218), rgb(174, 202, 255))",
 *   background: "light-dark(rgba(220, 220, 220, 0.9), rgba(0, 2, 9, 0.9))",
 * }
 * ```
 * @category Theming
 */
export interface Theme {
  /**
   * Font family
   */
  fontFamily: string;

  /**
   * Primary color
   */
  primary: string;

  /**
   * Primary color with 90% opacity
   */
  primary90: string;

  /**
   * Primary color with 80% opacity
   */
  primary80: string;
  /**
   * Primary color with 60% opacity
   */
  primary60: string;
  /**
   * Primary color with 40% opacity
   */
  primary40: string;
  /**
   * Primary color with 20% opacity
   */
  primary20: string;
  /**
   * Primary color with 10% opacity
   */
  primary10: string;
  /**
   * Primary color with 5% opacity
   */
  primary5: string;
  /**
   * Primary color with 1% opacity
   */
  primary1: string;

  /**
   * Secondary color
   */
  secondary: string;

  /**
   * Secondary color with 90% opacity
   */
  secondary90: string;

  /**
   * Secondary color with 80% opacity
   */
  secondary80: string;
  /**
   * Secondary color with 60% opacity
   */
  secondary60: string;
  /**
   * Secondary color with 40% opacity
   */
  secondary40: string;
  /**
   * Secondary color with 20% opacity
   */
  secondary20: string;
  /**
   * Secondary color with 10% opacity
   */
  secondary10: string;
  /**
   * Secondary color with 5% opacity
   */
  secondary5: string;
  /**
   * Secondary color with 1% opacity
   */
  secondary1: string;

  /**
   * Accent color used for prominent buttons (e.g. the send button), the loader
   * animation, and selected card outlines. Defaults to black/white so that
   * setting a brand accent produces a clearly visible change.
   */
  accent: string;
  /**
   * Accent color with 20% opacity
   */
  accent20: string;
  /**
   * Foreground color rendered on top of `accent` (e.g. the send button icon).
   * If omitted while `accent` is set to a solid color, it is derived
   * automatically for legible contrast.
   */
  onAccent: string;
  /**
   * The background color of the main Touchpoint interface
   */
  background: string;
  /**
   * The color of the overlay covering the visible portion of the website when the Touchpoint interface does not cover the full screen
   */
  overlay: string;

  /**
   * Primary warning color
   */
  warningPrimary: string;
  /**
   * Secondary warning color
   */
  warningSecondary: string;
  /**
   * Primary error color
   */
  errorPrimary: string;
  /**
   * Secondary error color
   */
  errorSecondary: string;

  /**
   * Inner border radius: used for most buttons
   */
  innerBorderRadius: string;
  /**
   * Outer border radius: generally used for elements that contain buttons that have inner border radius. Also used by the launch button.
   */
  outerBorderRadius: string;
}

/**
 * During a Live Sync liveSync conversation, you can indicate to the application the availability of
 * custom actions that the user can invoke.
 * @category Live Sync
 */
export interface LiveSyncCustomAction {
  /**
   * The name of the action, used to invoke it. Should be unique and descriptive in the context of the LLM.
   */
  action: string;
  /**
   * A short description of the action, used to help the LLM understand its purpose.
   *
   * If omitted, then the action will not be sent to the application and must be triggered
   * from the application side.
   */
  description?: string;

  /**
   * A JSON Schema that defines the structure of the action's input.
   *
   * Use descriptive names and `description` fields to give the underlying LLM plenty of context for
   * it to generate reasonable parameters. Note that the LLM output will be validated (and transformed)
   * with this schema, so you are guaranteed type safe inputs to your handler.
   *
   * Should follow the JSONSchema specification.
   */
  schema?: any;

  /**
   * Any additional input data that the LLM should have.
   */
  input?: any;
  /**
   * A handler that will be called with an argument matching the schema when the action is invoked.
   */
  handler: (value: any) => void;
}

/**
 * Instance of a Touchpoint UI component
 * @category Basics
 */
export interface TouchpointInstance {
  /**
   * Controls whether the Touchpoint UI is expanded or collapsed
   */
  expanded: boolean;
  /**
   * The conversation handler instance for interacting with the application
   */
  conversationHandler: ConnectConversationHandler;
  /**
   * Method to remove the Touchpoint UI from the DOM
   */
  teardown: () => void;

  /**
   * Sets currently available custom liveSync actions.
   * This allows you to define custom actions that can be used in the voice bot.
   * The actions will be available in the voice bot and can be used to trigger actions.
   *
   * Example:
   * ```javascript
   * client.setCustomLiveSyncActions([
   *     {
   *       action: "Meal",
   *       description: "add a meal to your flight",
   *       schema: {
   *         enum: ["standard", "vegetarian", "vegan", "gluten-free"],
   *       },
   *       handler: (value) => {
   *         console.log("Meal option:", value);
   *       },
   *     },
   *   ]);
   * ```
   *
   * This will allow the voice bot to use the action `Meal` with the value `standard`, `vegetarian`, `vegan`, or `gluten-free`.
   *
   * When using more complex arguments, a library such as [Zod](https://zod.dev) can be useful:
   *
   * ```javascript
   * import * as z from "zod/v4";
   *
   * const schema = z.object({
   *   "name": z.string().describe("The customer's name, such as John Doe"),
   *   "email": z.string().email().describe("The customer's email address"),
   * });
   *
   * client.setCustomLiveSyncActions([
   *     {
   *       action: "Meal",
   *       description: "add a meal to your flight",
   *       schema: z.toJSONSchema(schema, {io: "input"}),
   *       handler: (value) => {
   *         const result = z.safeParse(schema, value);
   *         if (result.success) {
   *           // result.data is now type safe and TypeScript can reason about it
   *           console.log("Meal option:", result.data);
   *         } else {
   *           console.error("Failed to parse Meal option:", result.error);
   *         }
   *       },
   *     },
   *   ]);
   * ```
   * @param actions - A list containing the custom actions to set.
   */
  setCustomLiveSyncActions: (actions: LiveSyncCustomAction[]) => void;

  /**
   * Sends Live Sync context to the assistant: the custom actions it may invoke, scope tags
   * for the current application state, and/or the fields it can fill. Call this explicitly
   * whenever the page's actions, scope, or fields change. Action handlers are registered
   * locally for dispatch; their definitions (plus scopes and fields) are sent to the agent.
   *
   * Example:
   * ```javascript
   * await touchpoint.sendContext({
   *   scopes: ["checkout"],
   *   actions: [
   *     { action: "apply_coupon", description: "Apply a coupon code",
   *       schema: { type: "object", properties: { code: { type: "string" } } },
   *       handler: ({ code }) => applyCoupon(code) },
   *   ],
   * });
   * ```
   * @param context - The actions, scopes, and/or fields to send.
   */
  sendContext: (context: LiveSyncContextInput) => Promise<void>;

  /**
   * Notifies the Live Sync application that the user reached a defined script step — for
   * example completed a form section or navigated to a page — so a Live Sync script can
   * advance. Script steps carry their own credentials (workspace, script, key); optionally
   * pass context (e.g. field values) for the step.
   *
   * Example:
   * ```javascript
   * await touchpoint.sendStep({
   *   stepId: "2f9d…-step-id",
   *   scriptId: "…",
   *   apiKey: "…",
   *   context: { selectedSeat: "4A" },
   * });
   * ```
   * @param params - The step id, script credentials, and optional context.
   */
  sendStep: (params: SendStepParams) => Promise<void>;
}

/**
 * Delivery status of an outbound user message, derived from Amazon Connect
 * message receipts (`sendMessage` acknowledgement, delivered and read receipts).
 * @category Basics
 */
export type MessageStatus =
  "sending" | "sent" | "delivered" | "read" | "failed";

/**
 * Copy configuration
 */
export interface Copy {
  /**
   * Escalation attempt notice
   */
  escalationAttemptNotice: string;
  /**
   * Escalation notice
   */
  escalationNotice: string;
  /**
   * Restart conversation button label
   */
  restartConversationButtonLabel: string;
  /**
   * Label for the button shown after the conversation has ended, which starts a new one.
   */
  startNewConversationButtonLabel: string;
  /**
   * Settings menu: download transcript button label.
   */
  downloadTranscriptButtonLabel: string;
  /**
   * Settings menu: end conversation button label.
   */
  endConversationButtonLabel: string;
  /**
   * Confirmation dialog shown before ending the conversation.
   */
  endConversationConfirm: {
    /** Dialog title. */
    title: string;
    /** Dialog body. */
    body: string;
    /** Confirm (end) button label. */
    confirm: string;
    /** Cancel button label. */
    cancel: string;
  };
  /**
   * Restart conversation button label
   */
  escalationButtonLabel: string;
  /**
   * Send message button label
   */
  sendMessageButtonLabel: string;
  /**
   * Copy for the Amazon Connect chat authentication card (Authenticate Customer
   * flow block). Optional — an English default is used when omitted.
   */
  authentication?: {
    /** Heading shown above the authentication card. */
    heading: string;
    /** Label for the button that opens the identity provider's login. */
    authenticate: string;
    /** Label for the secondary action that skips sign-in (cancels authentication). */
    continueWithoutSigningIn: string;
    /** Overlay hint shown on the disabled input while authentication is pending. */
    lockedInputHint: string;
    /** Status line text, keyed by {@link AuthenticationStatus}. */
    status: Record<AuthenticationStatus, string>;
  };
  /**
   * Participant display names shown when `showParticipantInfo` is enabled.
   */
  participants: {
    /** The end user. */
    you: string;
    /** The automated assistant. */
    bot: string;
    /** A human agent. */
    agent: string;
  };
  /**
   * Labels for per-message delivery status ({@link MessageStatus}).
   */
  messageStatus: {
    /** Message is being sent. */
    sending: string;
    /** Message was accepted by Amazon Connect. */
    sent: string;
    /** Message was delivered to the recipient. */
    delivered: string;
    /** Message was read by the recipient. */
    read: string;
    /** Message failed to send. */
    failed: string;
  };
  /**
   * Labels for Amazon Connect Views / step-by-step Guides.
   */
  guide: {
    /** Small label shown above the guide title on the card. */
    label: string;
    /** Fallback title while the view is loading or if it has no name. */
    defaultTitle: string;
    /** Fallback subtitle. */
    defaultSubtitle: string;
    /** Shown while the view definition is being resolved. */
    loading: string;
    /** Shown if the view could not be loaded. */
    error: string;
    /** Placeholder body shown in the guide modal (form renderer pending). */
    placeholder: string;
    /** Accessible label for closing the guide. */
    close: string;
    /** Guide progress states shown as a badge. */
    status: {
      /** The guide has not been opened yet. */
      notStarted: string;
      /** The guide has been opened but not completed. */
      inProgress: string;
      /** The guide has been completed. */
      complete: string;
    };
  };
}
