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
   * Answers ChatJS's first connection request with the connection
   * StartChatContact already issued, when it is still usable. Every other
   * request — a reconnect, or an expired initial connection — goes to the
   * wrapped client.
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
   * Ends the customer's part in the contact.
   */
  disconnectParticipant(connectionToken: string | null) {
    return this.inner.disconnectParticipant(connectionToken);
  }

  /**
   * Sends a chat message.
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
   * Sends a chat event, such as typing or a read receipt.
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
   * Reads the stored transcript.
   */
  getTranscript(
    connectionToken: string | null,
    args: connect.GetTranscriptArgs,
  ) {
    return this.inner.getTranscript(connectionToken, args);
  }

  /**
   * Uploads a file attachment and posts it to the contact.
   */
  sendAttachment(
    connectionToken: string | null,
    attachment: File | Blob,
    metadata?: unknown,
  ) {
    return this.inner.sendAttachment(connectionToken, attachment, metadata);
  }

  /**
   * Downloads a received attachment.
   */
  downloadAttachment(connectionToken: string | null, attachmentId: string) {
    return this.inner.downloadAttachment(connectionToken, attachmentId);
  }

  /**
   * Returns a short-lived download URL for a received attachment.
   */
  getAttachmentURL(connectionToken: string | null, attachmentId: string) {
    return this.inner.getAttachmentURL(connectionToken, attachmentId);
  }

  /**
   * Resolves a view token into its view definition.
   */
  describeView(viewToken: string, connectionToken: string | null) {
    return this.inner.describeView(viewToken, connectionToken);
  }

  /**
   * Returns the hosted identity-provider login URL for a sign-in session.
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
   * Cancels an in-progress sign-in session.
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
