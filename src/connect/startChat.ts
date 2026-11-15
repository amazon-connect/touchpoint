// Starting a chat contact needs no ChatJS or UI code, so a host can start one
// (see ../prefetch.ts) before it loads the rest of Touchpoint.

/**
 * The connection StartChatContact returns when it is called with
 * `ConnectionTypes: ["WEBSOCKET", "CONNECTION_CREDENTIALS"]`. Touchpoint hands
 * it to ChatJS once, saving the CreateParticipantConnection round trip.
 */
export interface InitialConnection {
  /** `Websocket.Url` */
  websocketUrl: string;
  /** `Websocket.ConnectionExpiry` (ISO 8601) */
  websocketExpiry: string;
  /** `ConnectionCredentials.ConnectionToken` */
  connectionToken: string;
  /** `ConnectionCredentials.Expiry` (ISO 8601) */
  connectionTokenExpiry: string;
}

const isText = (value: unknown): value is string =>
  typeof value === "string" && value !== "";

/**
 * Reads the inline connection from a StartChatContact result (PascalCase, as
 * the API and most proxies return it). Returns `undefined` unless it is
 * complete, so older backends fall back to the ordinary connection.
 */
export const readInitialConnection = (
  result: Record<string, unknown> | null | undefined,
): InitialConnection | undefined => {
  const websocket = result?.Websocket as Record<string, unknown> | undefined;
  const credentials = result?.ConnectionCredentials as
    Record<string, unknown> | undefined;
  if (
    !isText(websocket?.Url) ||
    !isText(websocket?.ConnectionExpiry) ||
    !isText(credentials?.ConnectionToken) ||
    !isText(credentials?.Expiry)
  ) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(websocket.Url);
  } catch {
    return undefined;
  }
  if (url.protocol !== "wss:") return undefined;
  return {
    websocketUrl: websocket.Url,
    websocketExpiry: websocket.ConnectionExpiry,
    connectionToken: credentials.ConnectionToken,
    connectionTokenExpiry: credentials.Expiry,
  };
};

/**
 * Chat details
 */
export interface ChatDetails {
  /** The contact ID */
  contactId: string;
  /** The participant ID */
  participantId: string;
  /**
   * The participant token used for authentication. Optional when a
   * `customChatClient` is provided.
   */
  participantToken?: string;
  /**
   * The connection StartChatContact returned alongside the participant, when it
   * was requested with `ConnectionTypes`. ChatJS uses it for its first
   * connection instead of calling CreateParticipantConnection; reconnects and
   * an expired connection still request fresh ones. Omit it to connect as usual.
   */
  initialConnection?: InitialConnection;
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
  /**
   * Ask the StartChatContact endpoint to also return the websocket and
   * connection credentials (`ConnectionTypes: ["WEBSOCKET", "CONNECTION_CREDENTIALS"]`),
   * saving one request before the chat connects. An endpoint that does not
   * forward `ConnectionTypes` is unaffected: Touchpoint then connects as usual.
   * Defaults to `false`.
   */
  requestInitialConnection?: boolean;
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
    ...(params.requestInitialConnection === true
      ? { ConnectionTypes: ["WEBSOCKET", "CONNECTION_CREDENTIALS"] }
      : {}),
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
  const initialConnection =
    params.requestInitialConnection === true
      ? readInitialConnection(startChatResult)
      : undefined;
  return {
    contactId: startChatResult.ContactId ?? startChatResult.contactId,
    participantId:
      startChatResult.ParticipantId ?? startChatResult.participantId,
    participantToken:
      startChatResult.ParticipantToken ?? startChatResult.participantToken,
    ...(initialConnection != null ? { initialConnection } : {}),
  };
};

const stageSuffix = (stage?: string): string =>
  stage != null && stage !== "" ? `-${stage}` : "";

/**
 * Infers the Amazon Connect participant service endpoint from the region and optional stage.
 * @param region - AWS region
 * @param stage - optional internal stage
 * @returns the Participant Service base URL
 */
export const participantEndpointForRegion = (
  region: string,
  stage?: string,
): string =>
  `https://participant.connect${stageSuffix(stage)}.${region}.api.aws`;

/** Where a chat's details come from: the configured `details`, or `chatEndpoint`. */
export interface ChatDetailsSourceConfig extends DetailsRequestParams {
  /** URL of the StartChatContact endpoint. */
  chatEndpoint?: string;
  /** Pre-obtained chat details, or a function returning them. */
  details?: ChatDetails | (() => Promise<ChatDetails>);
}

/**
 * Resolves the `details` source a chat uses: the configured one, or a request to `chatEndpoint`.
 * @param config - the Connect configuration
 * @returns the chat details, or a function that obtains them
 */
export const chatDetailsSource = (
  config: ChatDetailsSourceConfig,
): ChatDetails | (() => Promise<ChatDetails>) =>
  config.details ??
  (() =>
    fetchChatDetails(config.chatEndpoint ?? "", {
      instanceId: config.instanceId,
      contactFlowId: config.contactFlowId,
      participantDisplayName: config.participantDisplayName,
      contactAttributes: config.contactAttributes,
      supportedMessagingContentTypes: config.supportedMessagingContentTypes,
      requestInitialConnection: config.requestInitialConnection,
    }));
