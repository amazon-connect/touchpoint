import "amazon-connect-chatjs";

import type { InitialConnection } from "./startChat";

export { readInitialConnection, type InitialConnection } from "./startChat";

/** Reuse only with this much validity left, so ChatJS can still open the socket. */
const MIN_REMAINING_MS = 5000;

const usable = (connection: InitialConnection, now: number): boolean =>
  Date.parse(connection.websocketExpiry) > now + MIN_REMAINING_MS &&
  Date.parse(connection.connectionTokenExpiry) > now + MIN_REMAINING_MS;

type ChatClient = InstanceType<typeof connect.ChatSession.ChatClient>;

const OPTIONAL_METHODS = [
  "sendAttachment",
  "downloadAttachment",
  "getAttachmentURL",
  "describeView",
  "getAuthenticationUrl",
  "cancelParticipantAuthentication",
] as const;

/**
 * Wraps a chat client so ChatJS's first connection request is answered with the
 * connection StartChatContact already issued. Every other call — and any later
 * connection request, such as a reconnect or an expired initial connection —
 * goes to the wrapped client unchanged.
 */
export class InitialConnectionChatClient
  extends connect.ChatSession.ChatClient
{
  private initial: InitialConnection | undefined;

  /**
   * @param inner - the client that serves every other request
   * @param initial - the connection from StartChatContact, used at most once
   * @param onReuse - called when the initial connection is handed to ChatJS
   */
  constructor(
    private readonly inner: ChatClient,
    initial: InitialConnection,
    private readonly onReuse?: () => void,
  ) {
    super();
    this.initial = initial;
    // Keep ChatJS's report of unimplemented optional operations accurate for a
    // wrapped custom client: expose the base stub instead of a delegating method.
    const base = connect.ChatSession.ChatClient.prototype as unknown as Record<
      string,
      unknown
    >;
    for (const name of OPTIONAL_METHODS) {
      const method = (inner as unknown as Record<string, unknown>)[name];
      if (typeof method !== "function" || method === base[name]) {
        Object.defineProperty(this, name, { value: base[name] });
      }
    }
  }

  /**
   *
   */
  createParticipantConnection(
    participantToken: string | null,
    type: string[] | null,
    acknowledgeConnection: boolean | null,
  ): Promise<{ data: connect.CreateParticipantConnectionResult }> {
    const initial = this.initial;
    this.initial = undefined;
    if (
      initial != null &&
      acknowledgeConnection !== true &&
      type?.includes("WEBSOCKET") === true &&
      type.includes("CONNECTION_CREDENTIALS") &&
      usable(initial, Date.now())
    ) {
      try {
        this.onReuse?.();
      } catch {
        // An observer must not break the connection.
      }
      return Promise.resolve({
        data: {
          Websocket: {
            Url: initial.websocketUrl,
            ConnectionExpiry: initial.websocketExpiry,
          },
          ConnectionCredentials: {
            ConnectionToken: initial.connectionToken,
            Expiry: initial.connectionTokenExpiry,
          },
        },
      });
    }
    return this.inner.createParticipantConnection(
      participantToken,
      type,
      acknowledgeConnection,
    );
  }

  /**
   *
   */
  disconnectParticipant(connectionToken: string | null) {
    return this.inner.disconnectParticipant(connectionToken);
  }

  /**
   *
   */
  sendMessage(
    connectionToken: string | null,
    content: string,
    contentType: string,
    clientToken?: string,
  ) {
    return this.inner.sendMessage(
      connectionToken,
      content,
      contentType,
      clientToken,
    );
  }

  /**
   *
   */
  sendEvent(
    connectionToken: string | null,
    contentType: string,
    content: string,
    clientToken?: string,
  ) {
    return this.inner.sendEvent(
      connectionToken,
      contentType,
      content,
      clientToken,
    );
  }

  /**
   *
   */
  getTranscript(
    connectionToken: string | null,
    args: connect.GetTranscriptArgs,
  ) {
    return this.inner.getTranscript(connectionToken, args);
  }

  /**
   *
   */
  sendAttachment(
    connectionToken: string | null,
    attachment: File | Blob,
    metadata?: unknown,
  ) {
    return this.inner.sendAttachment(connectionToken, attachment, metadata);
  }

  /**
   *
   */
  downloadAttachment(connectionToken: string | null, attachmentId: string) {
    return this.inner.downloadAttachment(connectionToken, attachmentId);
  }

  /**
   *
   */
  getAttachmentURL(connectionToken: string | null, attachmentId: string) {
    return this.inner.getAttachmentURL(connectionToken, attachmentId);
  }

  /**
   *
   */
  describeView(viewToken: string, connectionToken: string | null) {
    return this.inner.describeView(viewToken, connectionToken);
  }

  /**
   *
   */
  getAuthenticationUrl(
    connectionToken: string | null,
    redirectUri: string,
    sessionId: string,
  ) {
    return this.inner.getAuthenticationUrl(
      connectionToken,
      redirectUri,
      sessionId,
    );
  }

  /**
   *
   */
  cancelParticipantAuthentication(
    connectionToken: string | null,
    sessionId: string,
  ) {
    return this.inner.cancelParticipantAuthentication(
      connectionToken,
      sessionId,
    );
  }
}
