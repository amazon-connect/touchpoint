import type { LiveSyncConnection } from "../interface";
import {
  createConnectChatConversation,
  fetchChatDetails,
  fetchWebRtcConnectionData,
  type ChatDetails,
  type ConnectConversationHandler,
  type DetailsRequestParams,
} from "./conversation";

export type {
  AuthenticationStatus,
  ChatDetails,
  ConnectConversationHandler,
  DetailsRequestParams,
  ResolvedView,
  WebRtcConnectionData,
} from "./conversation";
export { loadViewRenderer, viewRendererScriptUrl } from "./viewRenderer";

/**
 * Amazon Connect Chat connection details. Passed to Touchpoint as
 * {@link TouchpointConfiguration.config}; Touchpoint builds the conversation
 * from it — there is no separate adapter to wire up.
 * @category Basics
 */
export interface ConnectConfig extends DetailsRequestParams {
  /**
   * URL of your StartChatContact endpoint (e.g. an API Gateway route) that
   * mints a participant token. Required for chat unless `details` is supplied.
   */
  chatEndpoint?: string;
  /**
   * Pre-obtained chat details, as an alternative to `chatEndpoint`. May be a
   * value or a function returning a promise.
   */
  details?: ChatDetails | (() => Promise<ChatDetails>);
  /**
   * URL of your StartWebRTCContact endpoint (e.g. an API Gateway route) that starts an
   * in-app/web voice call and returns its Chime connection data. Required for the `voice`
   * and `voiceMini` inputs.
   */
  voiceEndpoint?: string;
  /** AWS region (e.g. "us-east-1"). Defaults to "us-west-2". */
  region?: string;
  /**
   * Your Amazon Connect instance URL (e.g. `https://your-instance.my.connect.aws`).
   * Required to render step-by-step Guides / Views: Touchpoint loads the Connect view
   * renderer from `{instanceUrl}/connectwidget/static/views/renderer/latest/index.js`.
   */
  instanceUrl?: string;
  /**
   * Redirect URI for chat authentication (the "Authenticate Customer" flow
   * block). Passed to GetAuthenticationUrl as the URL the hosted identity-provider
   * login returns to after sign-in; must be registered as an allowed callback on
   * your identity provider. Defaults to the current page origin.
   */
  authenticationRedirectUri?: string;
  /**
   * Backend endpoint that completes chat authentication. After the customer
   * signs in and is redirected back with `code`/`state`, Touchpoint POSTs
   * `{ code, state, instanceId, error }` here; the endpoint must call
   * `connect:UpdateParticipantAuthentication` (an admin API that can't be called
   * from the browser). Required to complete authentication.
   */
  authenticationEndpoint?: string;
  /** @hidden */
  stage?: string;
  /**
   * Additional global config passed to `connect.ChatSession.setGlobalConfig()`.
   * See the amazon-connect-chatjs documentation for available options.
   */
  globalConfig?: Record<string, unknown>;
}

const stageSuffix = (stage?: string): string =>
  stage != null && stage !== "" ? `-${stage}` : "";

/**
 * Infers the Live Sync action-socket host from the Amazon Connect region and optional stage.
 */
const liveSyncHostForRegion = (region: string, stage?: string): string =>
  `ws.nlu.acxd.connect${stageSuffix(stage)}.${region}.amazonaws.com`;

/**
 * Infers the Amazon Connect participant service endpoint from the region and optional stage.
 */
const participantEndpointForRegion = (region: string, stage?: string): string =>
  `https://participant.connect${stageSuffix(stage)}.${region}.api.aws`;

/**
 * Builds the Amazon Connect Chat conversation handler from a {@link ConnectConfig},
 * optionally opening the Live Sync action socket.
 * @param config - Connect connection details
 * @param languageCode - language code for the conversation
 * @param liveSync - optional Live Sync connection; when present, opens the action socket
 * @param options - additional handler options
 * @param options.chatEnabled - whether to open a chat session; `false` for voice-only inputs
 * @returns a `@nlxai/core`-compatible conversation handler
 */
export const buildConnectHandler = (
  config: ConnectConfig,
  languageCode: string,
  liveSync?: LiveSyncConnection,
  options?: { chatEnabled?: boolean },
): ConnectConversationHandler => {
  const details =
    config.details ??
    (() =>
      fetchChatDetails(config.chatEndpoint ?? "", {
        instanceId: config.instanceId,
        contactFlowId: config.contactFlowId,
        participantDisplayName: config.participantDisplayName,
        contactAttributes: config.contactAttributes,
        supportedMessagingContentTypes: config.supportedMessagingContentTypes,
      }));

  const voiceDetails =
    config.voiceEndpoint != null
      ? () =>
          fetchWebRtcConnectionData(config.voiceEndpoint ?? "", {
            instanceId: config.instanceId,
            contactFlowId: config.contactFlowId,
            participantDisplayName: config.participantDisplayName,
            contactAttributes: config.contactAttributes,
          })
      : undefined;

  const region = config.region ?? "us-west-2";

  // The participant service endpoint is inferred from the region/stage; an explicit
  // `globalConfig.endpoint` still wins.
  const globalConfig = {
    endpoint: participantEndpointForRegion(region, config.stage),
    ...(config.globalConfig ?? {}),
  };

  return createConnectChatConversation({
    details,
    ...(voiceDetails != null ? { voiceDetails } : {}),
    chatEnabled: options?.chatEnabled ?? true,
    region: config.region,
    ...(config.instanceId != null ? { instanceId: config.instanceId } : {}),
    ...(config.authenticationRedirectUri != null
      ? { authenticationRedirectUri: config.authenticationRedirectUri }
      : {}),
    ...(config.authenticationEndpoint != null
      ? { authenticationEndpoint: config.authenticationEndpoint }
      : {}),
    languageCode,
    globalConfig,
    ...(liveSync != null
      ? {
          liveSync: {
            host: liveSyncHostForRegion(region, config.stage),
            deploymentKey: liveSync.deploymentKey,
            apiKey: liveSync.apiKey,
            contactId: liveSync.contactId,
          },
        }
      : {}),
  });
};
