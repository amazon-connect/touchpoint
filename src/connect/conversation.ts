import type {
  ConversationHandler,
  Response,
  Subscriber,
  Context,
  SlotsRecordOrArray,
  SlotValue,
  StructuredRequest,
  NormalizedStructuredRequest,
  ChoiceRequestMetadata,
  RequestOverride,
  ConversationHandlerEvent,
  EventHandlers,
  VoicePlusContext,
  LanguageCode,
} from "@nlxai/core";
import { ResponseType } from "@nlxai/core";
import "amazon-connect-chatjs";
import { openLiveSyncSocket } from "./liveSync";
import type { MessageStatus } from "../interface";

/**
 * Configuration for the Amazon Connect Chat adapter.
 *
 * No AWS access keys or secret keys are required client-side. Authentication
 * is handled via the participant token returned by the StartChatContact API.
 *
 * Chat details are obtained via the `fetchChatDetails` call.
 */
export interface ConnectChatConfig {
  /** Pre-obtained chat details from a prior StartChatContact call. */
  details: ChatDetails | (() => Promise<ChatDetails>);
  /**
   * Resolves the WebRTC connection data (from StartWebRTCContact) used for voice input.
   * Only needed for `voice`/`voiceMini`.
   */
  voiceDetails?: () => Promise<WebRtcConnectionData>;
  /**
   * Whether to open an Amazon Connect Chat session. Defaults to `true`; set `false` for
   * voice-only inputs (`voice`/`voiceMini`), which use a WebRTC contact instead of chat.
   */
  chatEnabled?: boolean;
  /** AWS region (e.g., "us-east-1"). Defaults to "us-west-2". */
  region?: string;
  /**
   * Redirect URI passed to GetAuthenticationUrl for the "Authenticate Customer"
   * flow block — where the hosted identity-provider login sends the customer
   * after sign-in. Must be an allowed callback URL on the identity provider.
   * Defaults to the current page origin.
   */
  authenticationRedirectUri?: string;
  /**
   * Backend endpoint that completes chat authentication by calling
   * `connect:UpdateParticipantAuthentication` (an admin API that can't be called
   * from the browser). Receives `{ code, state, instanceId, error }`.
   */
  authenticationEndpoint?: string;
  /** Amazon Connect instance ID, forwarded to the authentication endpoint. */
  instanceId?: string;
  /** Language code for the conversation */
  languageCode?: LanguageCode;
  /**
   * Optional global config to pass to `connect.ChatSession.setGlobalConfig()`.
   * See the AmazonConnectChatJS documentation for available options.
   */
  globalConfig?: Record<string, unknown>;
  /**
   * Optional Live Sync action-socket connection. When provided, the handler opens the
   * receive-only Voice+ socket and emits each pushed action as a `voicePlusCommand` event.
   */
  liveSync?: {
    host: string;
    deploymentKey: string;
    apiKey: string;
    /** Contact ID sent as `conversationId`. Defaults to the session's own contact ID. */
    contactId?: string;
  };
}

/**
 * Chat details
 */
export interface ChatDetails {
  /** The contact ID */
  contactId: string;
  /** The participant ID */
  participantId: string;
  /** The participant token used for authentication */
  participantToken: string;
}

/**
 * Parameters to pass when calling the `startChatEndpoint`.
 */
export interface DetailsRequestParams {
  /** Connect instance ID */
  instanceId?: string;
  /** Contact flow ID to use */
  contactFlowId?: string;
  /** Customer display name */
  participantDisplayName?: string;
  /** Contact attributes passed to the contact flow */
  contactAttributes?: Record<string, string>;
  /**
   * Content types the chat participant supports receiving.
   * Defaults to text/plain, text/markdown, application/json, and interactive messages.
   */
  supportedMessagingContentTypes?: string[];
}

/**
 * Fetch chat details via API Gateway endpoint
 */
export const fetchChatDetails = async (
  endpoint: string,
  params: DetailsRequestParams,
): Promise<ChatDetails> => {
  const body: Record<string, unknown> = {
    InstanceId: params.instanceId,
    ContactFlowId: params.contactFlowId,
    ParticipantDetails: {
      DisplayName: params.participantDisplayName,
    },
    Attributes: params.contactAttributes,
    SupportedMessagingContentTypes: params.supportedMessagingContentTypes ?? [
      "text/plain",
      "text/markdown",
      "application/json",
      "application/vnd.amazonaws.connect.message.interactive",
      "application/vnd.amazonaws.connect.message.interactive.response",
    ],
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`StartChatContact endpoint returned ${res.status}`);
  }

  const data = await res.json();
  // The CloudFormation-deployed Lambda returns: { data: { startChatResult: { ContactId, ParticipantId, ParticipantToken } } }
  const startChatResult = data?.data?.startChatResult;
  return {
    contactId: startChatResult.ContactId ?? startChatResult.contactId,
    participantId:
      startChatResult.ParticipantId ?? startChatResult.participantId,
    participantToken:
      startChatResult.ParticipantToken ?? startChatResult.participantToken,
  };
};

/**
 * WebRTC connection data for voice, resolved from Amazon Connect's `StartWebRTCContact`
 * API. `meeting` and `attendee` are the Amazon Chime `Meeting` / `Attendee` objects the
 * browser feeds into the Chime SDK to open the audio session.
 */
export interface WebRtcConnectionData {
  /** Chime `Meeting` object (ConnectionData.Meeting). */
  meeting: unknown;
  /** Chime `Attendee` object (ConnectionData.Attendee), incl. its JoinToken. */
  attendee: unknown;
  /** The contact ID, if returned. */
  contactId?: string;
  /** The participant ID, if returned. */
  participantId?: string;
  /** The participant token, if returned (for DTMF via CreateParticipantConnection). */
  participantToken?: string;
}

/**
 * Fetch WebRTC connection data via a StartWebRTCContact proxy endpoint. Mirrors
 * {@link fetchChatDetails}: the endpoint is expected to call StartWebRTCContact server-side
 * (IAM-signed) and return its result — the Chime `ConnectionData` (`Meeting` + `Attendee`)
 * plus `ContactId`/`ParticipantId`/`ParticipantToken`.
 */
export const fetchWebRtcConnectionData = async (
  endpoint: string,
  params: DetailsRequestParams,
): Promise<WebRtcConnectionData> => {
  // Include both naming conventions so the same call works against a standard
  // StartWebRTCContact-shaped proxy (InstanceId / ParticipantDetails.DisplayName) and the
  // AWS in-app-calling sample (ConnectInstanceId / top-level DisplayName). Endpoints that
  // hardcode the instance/flow simply ignore the extra fields.
  const body: Record<string, unknown> = {
    InstanceId: params.instanceId,
    ConnectInstanceId: params.instanceId,
    ContactFlowId: params.contactFlowId,
    DisplayName: params.participantDisplayName,
    ParticipantDetails: {
      DisplayName: params.participantDisplayName,
    },
    Attributes: params.contactAttributes,
  };

  // Send as a CORS "simple request" (text/plain, no custom headers) so the browser skips
  // the OPTIONS preflight. The proxy Lambda parses the JSON body regardless of content
  // type, and this avoids needing OPTIONS/CORS-preflight configured on the API Gateway.
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`StartWebRTCContact endpoint returned ${res.status}`);
  }

  const data = await res.json();
  // Be lenient about the proxy's envelope: accept the StartWebRTCContact result at the top
  // level, under `data`, or under a `startWebRtcResult`/`startWebRTCContactResult` key.
  const payload =
    data?.data?.startWebRtcResult ??
    data?.data?.startWebRTCContactResult ??
    data?.startWebRtcResult ??
    data?.startWebRTCContactResult ??
    data?.data ??
    data;
  const connectionData =
    payload?.ConnectionData ?? payload?.connectionData ?? payload;

  return {
    meeting: connectionData?.Meeting ?? connectionData?.meeting,
    attendee: connectionData?.Attendee ?? connectionData?.attendee,
    contactId: payload?.ContactId ?? payload?.contactId,
    participantId: payload?.ParticipantId ?? payload?.participantId,
    participantToken: payload?.ParticipantToken ?? payload?.participantToken,
  };
};

const warnMethod = (methodName: string): void => {
  // eslint-disable-next-line no-console
  console.warn(
    `Message not sent: the '${methodName}' method is not supported by the Amazon Connect Chat Interface integration.`,
  );
};

/**
 * Content type used to send structured (non-utterance) requests to the contact flow.
 * Amazon Connect validates the body against its InteractiveMessageResponse schema, which
 * requires `version: "1.0"` and a non-empty `action` of at most 200 characters, and ignores
 * any additional fields. A body that misses either is rejected with
 * `InvalidRequestException: Message content is not a valid InteractiveMessageResponse`.
 */
const interactiveResponseContentType =
  "application/vnd.amazonaws.connect.message.interactive.response";

/** Template type shared by inbound and outbound Touchpoint modality envelopes. */
const touchpointModalityTemplateType = "TouchpointModality";

/** Maximum length Amazon Connect accepts for an interactive response's `action`. */
const maxInteractiveResponseActionLength = 200;

/**
 * Maximum `Content` size Amazon Connect accepts for an interactive response sent to a
 * conversational AI bot. Interactive responses on their own may be up to 25,600 bytes, but
 * anything addressed to a conversational AI bot is held to the lower limit.
 */
const maxInteractiveResponseBytes = 16384;

const normalizeSlots = (slots: SlotsRecordOrArray): SlotValue[] =>
  Array.isArray(slots)
    ? slots
    : Object.entries(slots).map(([slotId, value]) => ({ slotId, value }));

/** Number of slots named in a request's summary before the rest are counted off. */
const maxDescribedSlots = 3;

const formatSlotValue = (value: unknown): string =>
  typeof value === "string" ? value : (JSON.stringify(value) ?? String(value));

const describeSlots = (slots: SlotValue[]): string => {
  const described = slots
    .slice(0, maxDescribedSlots)
    .map(({ slotId, value }) => `${slotId}: ${formatSlotValue(value)}`)
    .join(", ");
  const remaining = slots.length - maxDescribedSlots;
  return remaining > 0 ? `${described} (+${remaining} more)` : described;
};

/**
 * Human-readable summary of a structured request, used as both the envelope's `action` and its
 * `data.content.title`.
 *
 * Surfaces that cannot render modalities fall back to the title, and the Connect agent portal
 * prints the raw envelope JSON when there is none — so every send needs one, including the slot
 * and context sends that have no display copy of their own. Ordered most to least specific: the
 * copy the user actually clicked, then what the request carries, then the template type as a
 * last resort no live send path reaches.
 */
const describeModalityRequest = ({
  structured,
  context,
  action,
}: {
  structured: NormalizedStructuredRequest;
  context?: Context;
  action?: string;
}): string => {
  if (action != null && action.trim() !== "") {
    return action.trim();
  }
  const { slots, intentId, choiceId } = structured;
  if (slots != null && slots.length > 0) {
    return describeSlots(slots);
  }
  if (intentId != null && intentId.trim() !== "") {
    return intentId;
  }
  if (choiceId != null && choiceId.trim() !== "") {
    return "Selected an option";
  }
  if (context != null && Object.keys(context).length > 0) {
    return "Updated conversation details";
  }
  return touchpointModalityTemplateType;
};

type ConversationHandlerEventListeners = Record<
  ConversationHandlerEvent,
  Array<EventHandlers[ConversationHandlerEvent]>
>;

const copy = {
  thinking: "Thinking...",
  typing: "Typing...",
  connecting: "Connecting...",
  connectionLost: "Connection lost. Please try again.",
  conversationEnded: "Conversation has ended",
};

/**
 * Sender of an inbound message, attached to Application responses so Touchpoint can
 * optionally show the participant's avatar and name.
 */
interface ParticipantInfo {
  participantRole: "bot" | "agent";
  participantName?: string;
}

/**
 * An Amazon Connect View/Guide definition, resolved from a `viewToken` via DescribeView.
 * `template` and `inputSchema` are parsed from the stringified JSON Connect returns.
 */
export interface ResolvedView {
  /** The view's resource id. */
  id?: string;
  /** The view's name. */
  name?: string;
  /** The view's version. */
  version?: number;
  /** Parsed component-tree template describing what to render. */
  template: any;
  /** Parsed schema describing the view's expected input data. */
  inputSchema?: any;
  /** Action names the view can emit (e.g. "Submit", "Next"). */
  actions: string[];
}

/**
 * Members of `@nlxai/core`'s {@link ConversationHandler} that the Amazon Connect
 * Chat integration does not support and therefore does not implement:
 * `submitFeedback`, `getVoiceCredentials`, `sendIntent` (a deprecated alias of
 * `sendFlow`), and `sendWelcomeIntent` (a deprecated alias of `sendWelcomeFlow`).
 */
type UnsupportedConnectHandlerMethods =
  "submitFeedback" | "getVoiceCredentials" | "sendIntent" | "sendWelcomeIntent";

/**
 * The subset of `@nlxai/core`'s {@link ConversationHandler} implemented by the
 * Amazon Connect Chat integration.
 */
export type ConnectConversationHandler = Omit<
  ConversationHandler,
  UnsupportedConnectHandlerMethods
>;

/**
 * State of an Amazon Connect chat authentication session (the "Authenticate
 * Customer" flow block). Surfaced on a notice response as `authentication`.
 * - `prompt` — an `authentication.initiated` event arrived; awaiting the user.
 * - `in_progress` — the hosted-IdP login was opened; awaiting the result.
 * - `success` / `failed` — the corresponding authentication event arrived.
 * - `expired` — the one-minute window to request the login URL elapsed.
 * - `cancelled` — the user cancelled (CancelParticipantAuthentication).
 */
export type AuthenticationStatus =
  "prompt" | "in_progress" | "success" | "failed" | "expired" | "cancelled";

// Content types Amazon Connect uses for authentication (Authenticate Customer
// flow block), mapped to the card's status. Completion is driven entirely by
// these websocket events — the hosted-login popup is fire-and-forget, so the
// terminal events below are what resolve the card (including when the customer
// simply closes the popup, which Connect reports as a timeout).
const AUTH_EVENT_STATUS: Record<string, AuthenticationStatus> = {
  "application/vnd.amazonaws.connect.event.authentication.initiated": "prompt",
  "application/vnd.amazonaws.connect.event.authentication.succeeded": "success",
  // Older/alternate spelling seen in some ChatJS docs.
  "application/vnd.amazonaws.connect.event.authentication.success": "success",
  "application/vnd.amazonaws.connect.event.authentication.failed": "failed",
  "application/vnd.amazonaws.connect.event.authentication.timeout": "expired",
  "application/vnd.amazonaws.connect.event.authentication.expired": "expired",
  "application/vnd.amazonaws.connect.event.authentication.cancelled":
    "cancelled",
};
const authInitiatedContentType =
  "application/vnd.amazonaws.connect.event.authentication.initiated";

/**
 * Creates a ConversationHandler backed by Amazon Connect Chat via amazon-connect-chatjs.
 * @example
 * ```typescript
 * import {
 *   create,
 *   createConnectChatConversation,
 * } from "@amazon-connect-touchpoint/web";
 *
 * const touchpoint = await create({
 *   conversationHandler: createConnectChatConversation({
 *     details: {
 *       contactId: "abc-123",
 *       participantId: "def-456",
 *       participantToken: "token-xyz",
 *     },
 *     region: "us-east-1",
 *   }),
 *   theme: { accent: "#0972d3" },
 * });
 * ```
 * @param config {ConnectChatConfig} - configuration
 * @returns conversationHandler {ConnectConversationHandler} - `@nlxai/core`-compatible conversation handler (minus the methods Connect Chat does not support), directly passable to Touchpoint UI.
 */
export const createConnectChatConversation = (
  config: ConnectChatConfig,
): ConnectConversationHandler => {
  const connect = (window as any).connect;

  let subscribers: Subscriber[] = [];
  let responses: Response[] = [];
  let languageCode: LanguageCode = config.languageCode ?? "en-US";
  let requestOverride: RequestOverride | undefined;
  let chatSession: Record<string, any> | null = null;
  let connected: boolean = false;
  // Identifies the current chat session. `reset` bumps it before tearing down the old
  // session so that session's late callbacks (e.g. the onEnded fired by disconnecting)
  // are ignored instead of polluting the fresh conversation's state.
  let sessionGeneration = 0;
  let currentInterimMessage: string | undefined = undefined;
  // TODO: keep track of when the conversation is escalated, stop triggering a typing interim message if true
  let escalated: boolean = false;
  let ended: boolean = false;
  // Throttles outbound typing events (Connect expires them after a few seconds).
  let lastTypingSentAt = 0;
  // Clears a stale inbound typing indicator if no message follows.
  let typingClearTimeout: ReturnType<typeof setTimeout> | null = null;

  // Amazon Connect chat authentication (Authenticate Customer flow block). The
  // sessionId arrives on the `authentication.initiated` event and is a one-time
  // code for GetAuthenticationUrl, valid for ~1 minute. A single notice response
  // (`authResponse`) is updated in place as the status transitions.
  let authSessionId: string | undefined;
  let authInitiatedAt = 0;
  let authResponse: Response | undefined;
  let currentAuthStatus: AuthenticationStatus | undefined;
  // The `state` embedded in the AuthenticationUrl; the redirect must echo it back
  // unchanged. Validating it is the primary defense against CSRF.
  let authExpectedState: string | undefined;
  // The hosted-login popup and the listener for the code/state it relays back.
  let authPopup: Window | null = null;
  let authMessageListener: ((event: MessageEvent) => void) | undefined;
  // Set once the popup relays a code/state; distinguishes a completed sign-in
  // from the customer dismissing the popup.
  let authRelayReceived = false;
  // Polls for the popup being closed without a relay (treated as cancelled).
  let authPopupPoll: ReturnType<typeof setInterval> | undefined;

  const eventListeners: ConversationHandlerEventListeners = {
    interimMessage: [],
    voicePlusCommand: [],
  };

  const setInterimMessage = (message?: string): void => {
    currentInterimMessage = message;
    eventListeners.interimMessage.forEach((listener) => listener(message));
  };

  // Live Sync: open the receive-only action socket (if configured) and re-emit each pushed
  // action as a `voicePlusCommand` event for the Live Sync action handler. The socket is
  // tied to a contact (sent as `conversationId`) and lives for the page session, so it
  // persists across chat reconnects and is not torn down on `reset`.
  //
  // When `liveSync.contactId` is not provided, the socket opens once the session resolves
  // its own contact ID — from chat (StartChatContact) or voice (StartWebRTCContact) — so
  // Live Sync can be collocated with the page without hardcoding a contact.
  // Live Sync context sent before a contact ID exists is held here and flushed once the
  // session resolves one (see `openLiveSync`), so an explicit `sendContext` right after
  // startup still reaches the assistant.
  let pendingLiveSyncContext: Record<string, unknown> | undefined;

  let liveSyncOpened = false;
  let liveSyncTeardown: (() => void) | undefined;
  const openLiveSync = (contactId: string | undefined): void => {
    if (config.liveSync == null || liveSyncOpened) return;
    if (contactId == null || contactId === "") return;
    // Best-effort: Live Sync must never block or abort the chat/voice session it rides on.
    // `openLiveSync` runs inside `initSession` (see below), so any failure here would
    // otherwise surface as a chat "Failed to connect".
    try {
      liveSyncOpened = true;
      liveSyncTeardown = openLiveSyncSocket(
        { ...config.liveSync, contactId, languageCode },
        (action) => {
          eventListeners.voicePlusCommand.forEach((listener) => {
            listener(action);
          });
        },
        // Send the advertised context only once the socket is connected: the Live
        // Sync backend needs an active subscriber for the contact, so posting it
        // before the connection is established drops it. `pendingLiveSyncContext`
        // is kept after each send precisely so it can be (re)played here — on the
        // fresh contact after a reset/reconnect too.
        () => {
          if (pendingLiveSyncContext != null) {
            void postLiveSync("context", pendingLiveSyncContext);
          }
        },
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[touchpoint] Live Sync failed to open; chat/voice is unaffected.",
        err,
      );
    }
  };

  // Re-arm collocated Live Sync so a new session (after `reset`) re-opens the socket on
  // the fresh contact and replays the last context. A fixed `liveSync.contactId` (e.g. a
  // phone call bound to the page) is left connected as-is — it isn't tied to this session.
  const rearmCollocatedLiveSync = (): void => {
    if (config.liveSync == null || config.liveSync.contactId != null) return;
    liveSyncTeardown?.();
    liveSyncTeardown = undefined;
    liveSyncOpened = false;
  };

  if (config.liveSync?.contactId != null) {
    openLiveSync(config.liveSync.contactId);
  }

  const notify = (newResponse?: Response): void => {
    subscribers.forEach((subscriber) => {
      subscriber([...responses], newResponse);
    });
  };

  const appendResponse = (response: Response): void => {
    responses = [...responses, response];
    notify(response);
  };

  // --- Amazon Connect chat authentication ---------------------------------
  // Reads the participant connection token ChatJS holds internally (ChatJS 2.x
  // does not expose GetAuthenticationUrl/CancelParticipantAuthentication, so we
  // call those ConnectParticipant APIs directly). Available once connected.
  const resolveConnectionToken = (): string | undefined => {
    const session = chatSession as any;
    const provider =
      session?.controller?.connectionDetailsProvider ??
      session?.connectionDetailsProvider;
    try {
      const token =
        provider?.getFetchedConnectionToken?.() ?? provider?.connectionToken;
      return typeof token === "string" && token !== "" ? token : undefined;
    } catch {
      return undefined;
    }
  };

  // The ConnectParticipant service endpoint (same host ChatJS uses), e.g.
  // https://participant.connect.<region>.api.aws
  const participantEndpoint = (): string => {
    const configured = (config.globalConfig as { endpoint?: unknown })
      ?.endpoint;
    const base =
      typeof configured === "string" && configured !== ""
        ? configured
        : `https://participant.connect.${config.region ?? "us-west-2"}.api.aws`;
    return base.replace(/\/$/, "");
  };

  // POSTs to a ConnectParticipant endpoint (e.g. /participant/authentication-url)
  // with the X-Amz-Bearer connection token. Returns the parsed JSON body.
  const participantAuthRequest = async (
    path: string,
    body: Record<string, unknown>,
  ): Promise<any> => {
    const token = resolveConnectionToken();
    if (token == null) {
      throw new Error("No participant connection token available.");
    }
    const res = await fetch(`${participantEndpoint()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Bearer": token,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`ConnectParticipant ${path} failed: ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  };

  // Creates or updates the single authentication notice, transitioning its state
  // in place (the UI renders one card that moves through the states).
  const setAuthState = (status: AuthenticationStatus): void => {
    currentAuthStatus = status;
    // Any terminal state ends the popup watch and the relay listener.
    if (
      status === "success" ||
      status === "failed" ||
      status === "expired" ||
      status === "cancelled"
    ) {
      if (authPopupPoll != null) {
        clearInterval(authPopupPoll);
        authPopupPoll = undefined;
      }
      if (authMessageListener != null) {
        window.removeEventListener("message", authMessageListener);
        authMessageListener = undefined;
      }
    }
    const updated = {
      type: ResponseType.Notice,
      receivedAt:
        (authResponse as { receivedAt?: number })?.receivedAt ?? Date.now(),
      payload: { text: "" },
      authentication: { status },
    } as unknown as Response;
    if (authResponse != null) {
      const previous = authResponse;
      responses = responses.map((r) => (r === previous ? updated : r));
      authResponse = updated;
      notify(updated);
    } else {
      authResponse = updated;
      appendResponse(updated);
    }
  };

  // --- Message delivery status (from Amazon Connect message receipts) ---
  // Core's UserResponse carries no id/status, so we tag each outbound user message
  // with a local token, attach a `status` field to the response, and advance it as
  // Connect acknowledges (`sent`), delivers, and reads the message.
  let statusCounter = 0;
  const newStatusToken = (): string => `msg-${(statusCounter += 1)}`;
  // Maps the Connect-assigned MessageId back to our local token, for receipts.
  const connectIdToToken = new Map<string, string>();
  const statusRank: Record<MessageStatus, number> = {
    sending: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    failed: 0,
  };

  /** Advances the status of the user message tagged with `token`, never regressing. */
  const setUserStatus = (token: string, status: MessageStatus): void => {
    let changed = false;
    responses = responses.map((response) => {
      const tagged = response as Response & {
        status?: MessageStatus;
        statusToken?: string;
      };
      if (response.type !== ResponseType.User || tagged.statusToken !== token) {
        return response;
      }
      const current = tagged.status;
      if (status === "failed") {
        // Only a still-sending message can fail.
        if (current != null && current !== "sending") return response;
      } else if (current != null && statusRank[status] <= statusRank[current]) {
        return response;
      }
      changed = true;
      return { ...response, status } as Response;
    });
    if (changed) notify();
  };

  let resolvedContactId: string | undefined;

  // Live Sync outbound HTTP. Same NLU host as the receive socket, minus the `ws.` prefix.
  // Context and script steps use different endpoints and auth:
  //  - context: `/nlu/c/<deploymentKey>/connect-<lang>/context`, `nlx-api-key` header, body
  //    `{ conversationId, context: { "nlx:vpContext": … } }` (Voice+ Context API).
  //  - step:    `/nlu/t/<deploymentKey>/connect-<lang>`, `nlx-api-key` (script key) header,
  //    body `{ stepId, conversationId, journeyId: <scriptId>, languageCode, context }`.
  //    The script credentials are supplied per call, in `body`.
  const postLiveSync = async (
    kind: "context" | "step",
    body: Record<string, unknown>,
  ): Promise<void> => {
    if (config.liveSync == null) return;
    const conversationId = config.liveSync.contactId ?? resolvedContactId;
    if (conversationId == null) return;
    const host = config.liveSync.host.replace(/^ws\./, "");

    let url: string;
    let headers: Record<string, string>;
    let payload: unknown;

    if (kind === "context") {
      const channel = `connect-${languageCode}`;
      url = `https://${host}/nlu/c/${config.liveSync.deploymentKey}/${channel}/context`;
      headers = {
        "Content-Type": "application/json",
        "nlx-api-key": config.liveSync.apiKey,
      };
      payload = { conversationId, context: body };
    } else {
      const { stepId, scriptId, apiKey, context } = body as {
        stepId: string;
        scriptId: string;
        apiKey: string;
        context?: Record<string, unknown>;
      };
      if (!scriptId || !apiKey) {
        // eslint-disable-next-line no-console
        console.error(
          "[touchpoint] Live Sync step ignored: sendStep requires scriptId and apiKey.",
        );
        return;
      }
      const channel = `connect-${languageCode}`;
      url = `https://${host}/nlu/t/${config.liveSync.deploymentKey}/${channel}`;
      headers = {
        "Content-Type": "application/json",
        "nlx-api-key": apiKey,
      };
      payload = {
        stepId,
        conversationId,
        journeyId: scriptId,
        languageCode,
        context: context ?? {},
      };
    }

    try {
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[touchpoint] Live Sync ${kind} request failed`, err);
    }
  };

  const initSession = async (): Promise<void> => {
    setInterimMessage(copy.connecting);

    const details: ChatDetails = await (typeof config.details === "function"
      ? config.details()
      : Promise.resolve(config.details));

    setInterimMessage(copy.thinking);

    resolvedContactId = details.contactId;
    // Collocated Live Sync: use this chat's contact ID when none was configured.
    openLiveSync(resolvedContactId);

    connect.ChatSession.setGlobalConfig({
      region: config.region ?? "us-west-2",
      // Delivered/read receipts are enabled by default; kept explicit for clarity.
      features: {
        messageReceipts: { shouldSendMessageReceipts: true },
      },
      ...(config.globalConfig ?? {}),
    });

    chatSession = connect.ChatSession.create({
      chatDetails: details,
      type: connect.ChatSession.SessionTypes.CUSTOMER,
    }) as Record<string, any>;

    // Snapshot this session's generation; if `reset` bumps it, every listener below
    // becomes a no-op so a stale session can't mutate the new conversation.
    const generation = sessionGeneration;
    const isStale = (): boolean => generation !== sessionGeneration;

    chatSession.onMessage((event: any) => {
      if (isStale()) return;
      const data = event.data;
      if (data == null) return;

      const participantRole = data.ParticipantRole;
      if (participantRole === "CUSTOMER") return;

      const contentType: string = data.ContentType ?? "";

      // Note: ChatJS's messageReceipts feature (enabled by default) sends the
      // delivered/read acknowledgements for inbound messages on its own — we must
      // not send them via `sendEvent`, which ChatJS rejects ("Ignoring messageReceipt").

      if (
        contentType ===
          "application/vnd.amazonaws.connect.event.participant.joined" &&
        participantRole === "AGENT"
      ) {
        escalated = true;
        appendResponse({
          type: ResponseType.Notice,
          receivedAt: Date.now(),
          payload: {
            text: "Agent has joined",
          },
          // Marker read by Touchpoint to disable bot-only menu options.
          agentJoined: true,
        } as Response);
        return;
      }

      if (
        contentType ===
          "application/vnd.amazonaws.connect.event.participant.left" &&
        participantRole === "AGENT"
      ) {
        escalated = false;
        appendResponse({
          type: ResponseType.Notice,
          receivedAt: Date.now(),
          payload: {
            text: "Agent has left",
          },
          agentLeft: true,
        } as Response);
        return;
      }

      // Amazon Connect chat authentication events (Authenticate Customer block).
      const authStatus = AUTH_EVENT_STATUS[contentType];
      if (authStatus != null) {
        if (contentType === authInitiatedContentType) {
          let sessionId: string | undefined;
          try {
            sessionId = JSON.parse(data.Content ?? "{}")?.SessionId;
          } catch {
            /* malformed event body */
          }
          authSessionId = sessionId;
          authInitiatedAt = Date.now();
          authResponse = undefined; // start a fresh authentication card
        } else {
          // Any terminal event ends the current authentication session.
          authSessionId = undefined;
        }
        setInterimMessage(undefined);
        setAuthState(authStatus);
        return;
      }

      setInterimMessage(undefined);

      // Who sent this inbound message, for optional avatar/name display.
      const participant: ParticipantInfo = {
        participantRole: participantRole === "AGENT" ? "agent" : "bot",
        participantName:
          typeof data.DisplayName === "string" &&
          data.DisplayName !== "" &&
          data.DisplayName !== "SYSTEM_MESSAGE"
            ? data.DisplayName
            : undefined,
      };

      // Inbound file attachments render as downloadable pills.
      if (Array.isArray(data.Attachments) && data.Attachments.length > 0) {
        const attachments = data.Attachments.map((attachment: any) => ({
          id: attachment.AttachmentId,
          name: attachment.AttachmentName,
          contentType: attachment.ContentType,
        }));
        appendResponse({
          type: ResponseType.Application,
          receivedAt: Date.now(),
          payload: {
            conversationId: resolvedContactId,
            messages: [{ text: data.Content ?? "", choices: [] }],
            metadata: { uploadUrls: [] },
          },
          ...participant,
          attachments,
        } as unknown as Response);
        return;
      }

      if (contentType === "text/plain" || contentType === "text/markdown") {
        const text: string = data.Content ?? "";
        if (text.startsWith("{") && text.includes('"modalities"')) {
          handleJsonMessage(text, participant);
        } else {
          const newResponse = {
            type: ResponseType.Application,
            receivedAt: Date.now(),
            payload: {
              conversationId: resolvedContactId,
              messages: [{ text, choices: [] }],
              metadata: { uploadUrls: [] },
            },
            ...participant,
          } as Response;
          appendResponse(newResponse);
        }
      } else if (contentType === "application/json") {
        handleJsonMessage(data.Content, participant);
      } else if (
        contentType === "application/vnd.amazonaws.connect.message.interactive"
      ) {
        handleInteractiveMessage(data.Content, participant);
      }
    });

    chatSession.onConnectionEstablished(() => {
      if (isStale()) return;
      connected = true;
    });

    chatSession.onConnectionBroken(() => {
      if (isStale()) return;
      connected = false;
      appendResponse({
        type: ResponseType.Failure,
        receivedAt: Date.now(),
        payload: { text: copy.connectionLost },
      });
    });

    chatSession.onTyping?.((event: any) => {
      if (isStale()) return;
      // Ignore the customer's own typing echoed back over the transcript; show all
      // other (agent) typing.
      if (event?.data?.ParticipantRole === "CUSTOMER") return;
      setInterimMessage(copy.typing);
      // Typing events expire; clear the indicator if no message follows.
      if (typingClearTimeout != null) clearTimeout(typingClearTimeout);
      typingClearTimeout = setTimeout(() => {
        if (currentInterimMessage === copy.typing) {
          setInterimMessage(undefined);
        }
      }, 5000);
    });

    const receiptMessageId = (event: any): string | undefined => {
      const receiptData = event?.data ?? {};
      const id =
        receiptData?.MessageMetadata?.MessageId ??
        receiptData?.MessageId ??
        receiptData?.Id;
      return id != null ? String(id) : undefined;
    };

    chatSession.onDeliveredReceipt?.((event: any) => {
      if (isStale()) return;
      const id = receiptMessageId(event);
      const token = id != null ? connectIdToToken.get(id) : undefined;
      if (token != null) setUserStatus(token, "delivered");
    });

    chatSession.onReadReceipt?.((event: any) => {
      if (isStale()) return;
      const id = receiptMessageId(event);
      const token = id != null ? connectIdToToken.get(id) : undefined;
      if (token != null) setUserStatus(token, "read");
    });

    chatSession.onEnded(() => {
      if (isStale()) return;
      connected = false;
      if (!ended) {
        ended = true;
        setInterimMessage(undefined);
        appendResponse({
          type: ResponseType.Notice,
          receivedAt: Date.now(),
          payload: { text: copy.conversationEnded },
          // Marker read by Touchpoint to swap the input for "Start new conversation".
          conversationEnded: true,
        } as Response);
      }
    });

    await chatSession.connect();
  };

  const handleJsonMessage = (
    content: string | undefined,
    participant?: ParticipantInfo,
  ): void => {
    if (content == null) return;
    const emit = (response: Response): void => {
      appendResponse(
        participant != null ? { ...response, ...participant } : response,
      );
    };
    try {
      const parsed = JSON.parse(content);

      const messages: Array<{
        text: string;
        choices: Array<{ choiceId: string; choiceText: string }>;
      }> = [];

      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        for (const msg of parsed.messages) {
          const choices = Array.isArray(msg.choices)
            ? msg.choices.map((c: any, i: number) => ({
                choiceId: c.choiceId ?? c.id ?? `choice-${i}`,
                choiceText:
                  c.choiceText ?? c.text ?? c.label ?? `Option ${i + 1}`,
              }))
            : [];
          messages.push({ text: msg.text ?? "", choices });
        }
      } else if (typeof parsed.text === "string") {
        messages.push({ text: parsed.text, choices: [] });
      } else {
        messages.push({ text: "", choices: [] });
      }

      const modalities =
        parsed.modalities != null && typeof parsed.modalities === "object"
          ? parsed.modalities
          : undefined;

      const newResponse: Response = {
        type: ResponseType.Application,
        receivedAt: Date.now(),
        payload: {
          conversationId: resolvedContactId,
          messages,
          metadata: { uploadUrls: [] },
          ...(modalities != null ? { modalities } : {}),
        },
      };

      emit(newResponse);
    } catch (_err) {
      emit({
        type: ResponseType.Application,
        receivedAt: Date.now(),
        payload: {
          conversationId: resolvedContactId,
          messages: [{ text: content, choices: [] }],
          metadata: { uploadUrls: [] },
        },
      });
    }
  };

  const handleInteractiveMessage = (
    content: string | undefined,
    participant?: ParticipantInfo,
  ): void => {
    if (content == null) return;
    const emit = (response: Response): void => {
      appendResponse(
        participant != null ? { ...response, ...participant } : response,
      );
    };
    try {
      const interactive = JSON.parse(content);
      const templateType = interactive.templateType;

      if (templateType === touchpointModalityTemplateType) {
        const modalityPayload = interactive.data?.content?.modalityPayload;
        if (modalityPayload?.type === "message") {
          const choices = modalityPayload?.choices;
          const messages = [
            { text: modalityPayload?.message, choices: choices ?? [] },
          ];
          const modalities = modalityPayload?.modalities;
          const newResponse: Response = {
            type: ResponseType.Application,
            receivedAt: Date.now(),
            payload: {
              conversationId: resolvedContactId,
              messages,
              modalities,
            },
          };
          emit(newResponse);
        } else if (modalityPayload?.type === "interim") {
          setInterimMessage(modalityPayload?.message);
        }
      } else if (templateType === "ViewResource") {
        // Amazon Connect Views / step-by-step Guides. The message does NOT inline the
        // view definition — it only references it: a viewId (managed or custom view ARN),
        // an encrypted viewToken, and runtime viewData. The actual Template/InputSchema is
        // resolved from the viewToken via a Connect API. We surface a guide card carrying
        // these references; the card resolves and renders the view.
        const content = interactive.data?.content ?? {};
        let parsedViewData: unknown = content.viewData;
        if (typeof content.viewData === "string") {
          try {
            parsedViewData = JSON.parse(content.viewData);
          } catch {
            parsedViewData = content.viewData;
          }
        }
        emit({
          type: ResponseType.Application,
          receivedAt: Date.now(),
          payload: {
            conversationId: resolvedContactId,
            messages: [],
            metadata: { uploadUrls: [] },
          },
          guide: {
            viewId: content.viewId,
            viewToken: content.viewToken,
            viewData: parsedViewData,
          },
        } as unknown as Response);
      } else if (
        templateType === "QuickReply" ||
        templateType === "ListPicker"
      ) {
        const title =
          interactive.data?.content?.title ??
          interactive.data?.content?.subtitle ??
          "";
        const elements =
          interactive.data?.content?.elements ??
          interactive.data?.content?.replies ??
          [];

        const choices = elements.map((el: any, index: number) => ({
          choiceId: el.title ?? `choice-${index}`,
          choiceText: el.title ?? `Option ${index + 1}`,
        }));

        const newResponse: Response = {
          type: ResponseType.Application,
          receivedAt: Date.now(),
          payload: {
            conversationId: resolvedContactId,
            messages: [{ text: title, choices }],
            metadata: { uploadUrls: [] },
          },
        };
        emit(newResponse);
      } else {
        const text = interactive.data?.content?.title ?? content;
        emit({
          type: ResponseType.Application,
          receivedAt: Date.now(),
          payload: {
            conversationId: resolvedContactId,
            messages: [{ text, choices: [] }],
            metadata: { uploadUrls: [] },
          },
        });
      }
    } catch (_err) {
      emit({
        type: ResponseType.Application,
        receivedAt: Date.now(),
        payload: {
          conversationId: resolvedContactId,
          messages: [{ text: content, choices: [] }],
          metadata: { uploadUrls: [] },
        },
      });
    }
  };

  // Opens the Connect Chat session, unless chat is disabled (voice/voiceMini input, which
  // uses a WebRTC contact instead of chat — see `startWebRtcContact`). Stores the promise
  // so outbound sends queue behind the connection handshake.
  const openChatSession = (): Promise<void> => {
    if (config.chatEnabled === false) {
      return Promise.resolve();
    }
    return initSession().catch((err) => {
      setInterimMessage(undefined);
      appendResponse({
        type: ResponseType.Failure,
        receivedAt: Date.now(),
        payload: {
          text: `Failed to connect: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      });
    });
  };

  let connectionReady = openChatSession();

  /**
   * Single outbound path to Connect. Surfaces rejections from the participant API, which
   * `sendMessage` would otherwise throw as an unhandled promise.
   */
  const sendChatMessage = (
    params: {
      contentType: string;
      message: string;
    },
    statusToken?: string,
  ): void => {
    void connectionReady.then(() => {
      const pending = chatSession?.sendMessage(params);
      void pending
        ?.then?.((result: any) => {
          if (statusToken != null) {
            const connectId = result?.data?.Id ?? result?.data?.MessageId;
            if (connectId != null) {
              connectIdToToken.set(String(connectId), statusToken);
            }
            setUserStatus(statusToken, "sent");
          }
        })
        ?.catch?.((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error(
            "[connect-chat-adapter] sendMessage failed",
            err,
            params,
          );
          if (statusToken != null) {
            setUserStatus(statusToken, "failed");
          }
        });
    });
  };

  /**
   * Sends a structured request as an interactive response, mirroring the inbound
   * `TouchpointModality` envelope: `data.modalityPayload` holds the NLX request verbatim, and
   * `action` plus `data.content.title` carry the same human-readable summary of it. Queued
   * behind the connection handshake the same way text messages are.
   *
   * Amazon Connect rejects the message outright without an `action`, and every surface that
   * cannot render the modality itself — the agent portal above all — reads the title, so both
   * are always set, whether or not the user clicked something with copy of its own.
   */
  const sendModalityRequest = ({
    structured,
    context,
    action,
  }: {
    structured: NormalizedStructuredRequest;
    context?: Context;
    action?: string;
  }): void => {
    const title = describeModalityRequest({
      structured,
      context,
      action,
    }).slice(0, maxInteractiveResponseActionLength);

    const message = JSON.stringify({
      templateType: touchpointModalityTemplateType,
      version: "1.0",
      action: title,
      data: {
        // A sibling of `modalityPayload`, never nested inside it: the contact flow rejects any
        // key in `modalityPayload` beyond `request` and `context`.
        content: { title },
        modalityPayload: {
          request: { structured },
          ...(context != null ? { context } : {}),
        },
      },
    });

    if (
      new TextEncoder().encode(message).length > maxInteractiveResponseBytes
    ) {
      // eslint-disable-next-line no-console
      console.error(
        `Message not sent: structured payload exceeds the ${maxInteractiveResponseBytes}-byte limit Amazon Connect allows for interactive responses.`,
      );
      return;
    }

    sendChatMessage({
      contentType: interactiveResponseContentType,
      message,
    });
  };

  const sendText = (text: string, context?: Context): void => {
    if (requestOverride != null) {
      requestOverride(
        {
          conversationId: resolvedContactId,
          request: { unstructured: { text } },
          context,
        },
        () => {},
      );
      return;
    }

    setInterimMessage(escalated ? undefined : copy.thinking);

    const statusToken = newStatusToken();
    const newResponse = {
      type: ResponseType.User,
      receivedAt: Date.now(),
      payload: { type: "text", text, context },
      status: "sending",
      statusToken,
    } as Response;

    appendResponse(newResponse);

    sendChatMessage(
      {
        contentType: "text/plain",
        message: text,
      },
      statusToken,
    );
  };

  /**
   * Resolves the display copy of a choice from the message it belongs to, so the outbound
   * envelope's `action` reads like what the user clicked rather than an opaque id.
   */
  const findChoiceText = (
    choiceId: string,
    metadata?: ChoiceRequestMetadata,
  ): string | undefined => {
    const response = responses[metadata?.responseIndex ?? -1];
    if (response == null || response.type !== ResponseType.Application) {
      return undefined;
    }
    const message = response.payload.messages[metadata?.messageIndex ?? -1];
    return message?.choices.find((choice) => choice.choiceId === choiceId)
      ?.choiceText;
  };

  const sendChoice = (
    choiceId: string,
    context?: Context,
    metadata?: ChoiceRequestMetadata,
  ): void => {
    const action = findChoiceText(choiceId, metadata);

    const responseIndex = metadata?.responseIndex ?? -1;
    const messageIndex = metadata?.messageIndex ?? -1;

    // Mark the originating message as answered so Touchpoint collapses the other choices.
    if (responseIndex > -1 && messageIndex > -1) {
      responses = responses.map((response, index) =>
        index === responseIndex && response.type === ResponseType.Application
          ? {
              ...response,
              payload: {
                ...response.payload,
                messages: response.payload.messages.map((message, msgIndex) =>
                  msgIndex === messageIndex
                    ? { ...message, selectedChoiceId: choiceId }
                    : message,
                ),
              },
            }
          : response,
      );
    }

    setInterimMessage(escalated ? undefined : copy.thinking);

    appendResponse({
      type: ResponseType.User,
      receivedAt: Date.now(),
      payload: { type: "choice", choiceId, context },
    });

    sendModalityRequest({ structured: { choiceId }, context, action });
  };

  const subscribe = (subscriber: Subscriber): (() => void) => {
    subscribers = [...subscribers, subscriber];
    subscriber([...responses]);
    return () => {
      unsubscribe(subscriber);
    };
  };

  const unsubscribe = (subscriber: Subscriber): void => {
    subscribers = subscribers.filter((fn) => fn !== subscriber);
  };

  const handler: ConnectConversationHandler & {
    endConversation: () => void;
    getConnectTranscript: () => Promise<Array<Record<string, unknown>>>;
    sendTyping: () => void;
    sendAttachment: (file: File) => Promise<void>;
    downloadAttachment: (attachmentId: string) => Promise<void>;
    describeView: (viewToken: string) => Promise<ResolvedView | null>;
    submitView: (payload: {
      action: string;
      data?: unknown;
      viewName?: string;
    }) => void;
    startWebRtcContact: () => Promise<WebRtcConnectionData>;
    sendStep: (params: {
      stepId: string;
      scriptId: string;
      apiKey: string;
      context?: Record<string, unknown>;
    }) => Promise<void>;
    // Opens the hosted IdP login for the active authentication session (from an
    // `authentication.initiated` event). `redirectUri` must match a callback URL
    // registered on the identity provider; defaults to the current page origin.
    startAuthentication: (redirectUri?: string) => Promise<void>;
    // Completes authentication by relaying the redirect's `code`/`state` to the
    // configured authentication endpoint (which calls UpdateParticipantAuthentication).
    completeAuthentication: (params: {
      code?: string;
      state: string;
      error?: string;
      errorDescription?: string;
    }) => Promise<void>;
    // Cancels the active authentication session (takes the flow's opt-out branch).
    cancelAuthentication: () => Promise<void>;
  } = {
    sendText,
    sendChoice,

    sendSlots: (slots: SlotsRecordOrArray, context?: Context): void => {
      const normalizedSlots = normalizeSlots(slots);

      setInterimMessage(escalated ? undefined : copy.thinking);

      appendResponse({
        type: ResponseType.User,
        receivedAt: Date.now(),
        payload: { type: "structured", slots: normalizedSlots, context },
      });

      sendModalityRequest({ structured: { slots: normalizedSlots }, context });
    },

    sendWelcomeFlow: (_context?: Context): void => {
      warnMethod("sendWelcomeFlow");
    },

    sendFlow: (_flowId: string, _context?: Context): void => {
      warnMethod("sendFlow");
    },

    // Sends page context to the Live Sync application so it knows the current page's form
    // fields, links, and available custom actions. Posted to the Live Sync context endpoint
    // (no-op unless Live Sync is configured). This powers automatic navigation/form-filling.
    sendContext: async (context: Context): Promise<void> => {
      pendingLiveSyncContext = context;
      await postLiveSync("context", context);
    },

    sendStructured: (
      structured: StructuredRequest,
      context?: Context,
    ): void => {
      const normalized: NormalizedStructuredRequest = {
        ...structured,
        intentId: structured.flowId ?? structured.intentId,
        slots:
          structured.slots != null
            ? normalizeSlots(structured.slots)
            : undefined,
      };

      const { utterance, ...rest } = normalized;

      // A bare utterance is an ordinary chat message; anything else needs the envelope.
      if (utterance != null && !Object.values(rest).some((v) => v != null)) {
        sendText(utterance, context);
        return;
      }

      setInterimMessage(escalated ? undefined : copy.thinking);

      appendResponse({
        type: ResponseType.User,
        receivedAt: Date.now(),
        payload: { type: "structured", ...normalized, context },
      });

      sendModalityRequest({
        structured: normalized,
        context,
        action: utterance ?? findChoiceText(normalized.choiceId ?? ""),
      });
    },

    sendVoicePlusContext: (_context: VoicePlusContext): void => {
      warnMethod("sendVoicePlusContext");
    },

    appendMessageToTranscript: (newResponse): void => {
      const responseWithTimestamp = {
        ...newResponse,
        receivedAt: (newResponse as any).receivedAt ?? Date.now(),
      };
      responses = [...responses, responseWithTimestamp];
      notify(responseWithTimestamp);
    },

    subscribe,
    unsubscribe,

    unsubscribeAll: (): void => {
      subscribers = [];
    },

    currentConversationId: (): string | undefined => resolvedContactId,

    currentLanguageCode: (): LanguageCode => languageCode,

    setLanguageCode: (code: LanguageCode): void => {
      languageCode = code;
    },

    reset: (options?: { clearResponses?: boolean }): void => {
      // Invalidate the current session first: disconnecting below fires its onEnded
      // (and possibly other) callbacks asynchronously, which would otherwise re-append
      // the "Conversation has ended" notice into the freshly-cleared conversation.
      sessionGeneration += 1;
      if (options?.clearResponses) {
        responses = [];
      }
      ended = false;
      escalated = false;
      authSessionId = undefined;
      authResponse = undefined;
      currentAuthStatus = undefined;
      authExpectedState = undefined;
      authRelayReceived = false;
      if (authPopupPoll != null) {
        clearInterval(authPopupPoll);
        authPopupPoll = undefined;
      }
      if (authMessageListener != null) {
        window.removeEventListener("message", authMessageListener);
        authMessageListener = undefined;
      }
      authPopup = null;
      setInterimMessage(undefined);
      notify();
      // Disconnect old session and start a fresh Connect Chat session
      if (chatSession != null && connected) {
        try {
          (chatSession as any).disconnectParticipant();
        } catch (_e) {
          /* best effort */
        }
      }
      connected = false;
      chatSession = null;
      resolvedContactId = undefined;
      // Replay Live Sync context after a refresh. Collocated Live Sync rebinds to the
      // fresh contact and replays context when it reconnects (see `openLiveSync`, driven
      // by the new session below). A fixed `contactId` stays connected, so re-post the
      // last context to it right away.
      rearmCollocatedLiveSync();
      if (
        config.liveSync?.contactId != null &&
        pendingLiveSyncContext != null
      ) {
        void postLiveSync("context", pendingLiveSyncContext);
      }
      connectionReady = openChatSession();
    },

    destroy: (): void => {
      subscribers = [];
      if (chatSession != null && connected) {
        (chatSession as any).disconnectParticipant();
      }
    },

    // Ends the conversation by disconnecting the participant. This fires ChatJS's
    // chat.ended event (onEnded), which appends the "Conversation has ended" notice.
    endConversation: (): void => {
      if (chatSession != null && connected) {
        try {
          (chatSession as any).disconnectParticipant();
        } catch (_e) {
          /* best effort */
        }
      }
    },

    // Uploads a file attachment via ChatJS (atomic: upload + post). Resolves once the
    // upload succeeds — at which point the customer's own attachment is appended to the
    // transcript — and rejects if it fails, so the caller can show upload status.
    sendAttachment: async (file: File): Promise<void> => {
      await connectionReady;
      await (chatSession as any)?.sendAttachment?.({ attachment: file });
      appendResponse({
        type: ResponseType.User,
        receivedAt: Date.now(),
        payload: {
          type: "structured",
          utterance: file.name,
          uploadIds: [],
        },
        attachmentFile: file,
      } as unknown as Response);
    },

    // Downloads a received attachment via ChatJS and saves it in the browser.
    downloadAttachment: async (attachmentId: string): Promise<void> => {
      if (chatSession == null) return;
      try {
        const result = await (chatSession as any).downloadAttachment({
          attachmentId,
        });
        const blob: Blob | undefined = result?.attachment ?? result;
        if (blob == null) return;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download =
          (result?.attachment as File | undefined)?.name ?? "attachment";
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[touchpoint] downloadAttachment failed", err);
      }
    },

    // Resolves an Amazon Connect View/Guide reference (viewToken) into its definition
    // via ChatJS's DescribeView (participant-auth; no IAM). The Template/InputSchema come
    // back as stringified JSON, so parse them for the renderer.
    describeView: async (viewToken: string): Promise<ResolvedView | null> => {
      await connectionReady;
      if (chatSession == null || viewToken == null) return null;
      try {
        const result = await (chatSession as any).describeView({ viewToken });
        const view = result?.data?.View ?? result?.View;
        if (view == null) return null;
        const parse = (value: unknown): any => {
          if (typeof value !== "string") return value;
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        };
        return {
          id: view.Id,
          name: view.Name,
          version: view.Version,
          template: parse(view.Content?.Template),
          inputSchema: parse(view.Content?.InputSchema),
          actions: Array.isArray(view.Content?.Actions)
            ? view.Content.Actions
            : [],
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[touchpoint] describeView failed", err);
        return null;
      }
    },

    // Submits an Amazon Connect View/Guide action (from the <connect-view-renderer>'s
    // onAction event) back to the contact flow as an interactive response, which advances
    // the guide to its next step.
    submitView: ({ action, data, viewName }): void => {
      const message = JSON.stringify({
        templateType: "ViewResource",
        version: "1.0",
        ...(viewName != null ? { viewName } : {}),
        action,
        data: data ?? {},
      });
      sendChatMessage({
        contentType: interactiveResponseContentType,
        message,
      });
    },

    // Resolves the WebRTC connection data (Chime Meeting + Attendee) used to open a voice
    // session, via the configured StartWebRTCContact proxy.
    startWebRtcContact: async (): Promise<WebRtcConnectionData> => {
      if (config.voiceDetails == null) {
        throw new Error(
          "Voice is not configured: set `voiceEndpoint` in the Connect config.",
        );
      }
      const data = await config.voiceDetails();
      resolvedContactId = data.contactId ?? resolvedContactId;
      // Collocated Live Sync: use this voice contact's ID when none was configured.
      openLiveSync(data.contactId);
      return data;
    },

    // Notifies the Live Sync application that the user reached a defined script step (e.g.
    // completed a form or navigated to a page), optionally with context. Script credentials
    // (script id + key) are supplied per call, not via config.
    sendStep: async (params: {
      stepId: string;
      scriptId: string;
      apiKey: string;
      context?: Record<string, unknown>;
    }): Promise<void> => {
      await postLiveSync("step", { ...params });
    },

    startAuthentication: async (redirectUri?: string): Promise<void> => {
      if (authSessionId == null) {
        // eslint-disable-next-line no-console
        console.error("[touchpoint] No authentication session to start.");
        return;
      }
      // GetAuthenticationUrl must be called within ~1 minute of the initiated event.
      if (Date.now() - authInitiatedAt > 60_000) {
        setAuthState("expired");
        return;
      }
      try {
        setAuthState("in_progress");
        const data = await participantAuthRequest(
          "/participant/authentication-url",
          {
            SessionId: authSessionId,
            RedirectUri:
              redirectUri ??
              config.authenticationRedirectUri ??
              window.location.origin,
          },
        );
        const url = data?.AuthenticationUrl;
        if (typeof url !== "string" || url === "") {
          setAuthState("failed");
          return;
        }
        // Remember the state Amazon Connect embedded in the URL; the redirect must
        // echo it back unchanged (CSRF check in completeAuthentication).
        try {
          authExpectedState =
            new URL(url).searchParams.get("state") ?? undefined;
        } catch {
          authExpectedState = undefined;
        }
        // Listen for the redirect landing page relaying the OAuth code/state
        // back to this window (see the docs on completeAuthentication). Once
        // received, complete authentication and close the popup; Connect then
        // emits authentication.succeeded/failed, which updates the card.
        if (authMessageListener != null) {
          window.removeEventListener("message", authMessageListener);
        }
        authRelayReceived = false;
        authMessageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          const payload = event.data;
          if (payload?.source !== "touchpoint-authentication") return;
          authRelayReceived = true;
          if (authMessageListener != null) {
            window.removeEventListener("message", authMessageListener);
            authMessageListener = undefined;
          }
          void handler.completeAuthentication({
            code: payload.code,
            state: payload.state,
            error: payload.error,
            errorDescription: payload.errorDescription,
          });
        };
        window.addEventListener("message", authMessageListener);
        // Open the hosted IdP login.
        authPopup = window.open(
          url,
          "connect-authentication",
          "width=480,height=720",
        );
        // If the customer closes the popup without completing sign-in (no
        // code/state relayed) while we're still waiting, treat it as a cancel.
        if (authPopupPoll != null) clearInterval(authPopupPoll);
        authPopupPoll = setInterval(() => {
          if (authPopup != null && !authPopup.closed) return;
          clearInterval(authPopupPoll);
          authPopupPoll = undefined;
          // Give any in-flight relay message a moment to arrive before deciding.
          setTimeout(() => {
            if (
              !authRelayReceived &&
              currentAuthStatus === "in_progress" &&
              authSessionId != null
            ) {
              void handler.cancelAuthentication();
            }
          }, 400);
        }, 500);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[touchpoint] getAuthenticationUrl failed", err);
        setAuthState("failed");
      }
    },

    completeAuthentication: async (params: {
      code?: string;
      state: string;
      error?: string;
      errorDescription?: string;
    }): Promise<void> => {
      // Close the hosted-login popup now that it has relayed the result.
      try {
        authPopup?.close();
      } catch {
        /* cross-origin popup may already be closed */
      }
      authPopup = null;
      // CSRF check: the redirect must echo back the exact `state` from the
      // AuthenticationUrl. Reject on mismatch before completing.
      const expectedState = authExpectedState;
      authExpectedState = undefined;
      if (expectedState != null && params.state !== expectedState) {
        // eslint-disable-next-line no-console
        console.error(
          "[touchpoint] authentication state mismatch; rejecting (possible CSRF).",
        );
        setAuthState("failed");
        return;
      }
      // Completion runs connect:UpdateParticipantAuthentication server-side (it
      // can't be called from the browser), so relay the code/state to the
      // configured backend endpoint.
      const endpoint = config.authenticationEndpoint;
      if (endpoint == null || endpoint === "") {
        // eslint-disable-next-line no-console
        console.error(
          "[touchpoint] authenticationEndpoint is required to complete chat authentication.",
        );
        setAuthState("failed");
        return;
      }
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: params.code,
            state: params.state,
            instanceId: config.instanceId,
            error: params.error,
            errorDescription: params.errorDescription,
          }),
        });
        if (!res.ok) {
          throw new Error(`authenticationEndpoint returned ${res.status}`);
        }
        // Success is confirmed by the authentication.succeeded event over the
        // websocket; leave the card in its in-progress state until then.
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[touchpoint] completeAuthentication failed", err);
        setAuthState("failed");
      }
    },

    cancelAuthentication: async (): Promise<void> => {
      const sessionId = authSessionId;
      if (sessionId == null) return;
      try {
        await participantAuthRequest("/participant/cancel-authentication", {
          SessionId: sessionId,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[touchpoint] cancelParticipantAuthentication failed",
          err,
        );
      } finally {
        setAuthState("cancelled");
      }
    },

    // Sends a customer typing event so the agent sees the typing indicator.
    // Throttled, since Connect expires typing events after a few seconds.
    sendTyping: (): void => {
      const now = Date.now();
      if (now - lastTypingSentAt < 2500) return;
      lastTypingSentAt = now;
      try {
        void (chatSession as any)?.sendEvent?.({
          contentType: "application/vnd.amazonaws.connect.event.typing",
        });
      } catch {
        /* best effort */
      }
    },

    // Returns the server-side transcript items via ChatJS getTranscript.
    getConnectTranscript: async (): Promise<Array<Record<string, unknown>>> => {
      if (chatSession == null) return [];
      try {
        const result = await (chatSession as any).getTranscript({
          maxResults: 100,
          sortOrder: "ASCENDING",
        });
        return result?.data?.Transcript ?? [];
      } catch {
        return [];
      }
    },

    setRequestOverride: (override: RequestOverride | undefined): void => {
      requestOverride = override;
    },

    addEventListener: (
      event: ConversationHandlerEvent,
      handler: EventHandlers[ConversationHandlerEvent],
    ): void => {
      if (event === "interimMessage") {
        handler(currentInterimMessage);
      }
      eventListeners[event].push(handler);
    },

    removeEventListener: (
      event: ConversationHandlerEvent,
      handler: EventHandlers[ConversationHandlerEvent],
    ): void => {
      eventListeners[event] = eventListeners[event].filter(
        (h) => h !== handler,
      );
    },

    setInterimMessage,
  };

  return handler;
};
