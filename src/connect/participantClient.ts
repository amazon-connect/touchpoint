import "amazon-connect-chatjs";

/** Same leading-edge window ChatJS's bundled client uses for typing events. */
const TYPING_CONTENT_TYPE = "application/vnd.amazonaws.connect.event.typing";
const TYPING_VALIDITY_MS = 10000;

/** Options for {@link ParticipantServiceClient}. */
export interface ParticipantServiceClientOptions {
  /** Attempts per request, including the first. Defaults to 3. */
  maxAttempts?: number;
  /** Per-attempt timeout. Defaults to 10 seconds. */
  timeoutMs?: number;
}

const newClientToken = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * The error shape ChatJS's bundled client rejects with (`type`, `statusCode`),
 * so ChatJS's own checks (e.g. a 403 meaning the chat ended) keep working.
 */
const participantError = (
  operation: string,
  type: string,
  message: string,
  statusCode?: number,
): Error =>
  Object.assign(new Error(message), {
    name: type,
    type,
    statusCode,
    operation,
  });

const retryable = (error: unknown): boolean => {
  const status = (error as { statusCode?: number }).statusCode;
  return status === undefined || status === 429 || status >= 500;
};

const errorTypeFrom = (response: Response, body: unknown): string => {
  const raw =
    response.headers.get("x-amzn-errortype") ??
    (body as { __type?: string; code?: string } | null)?.__type ??
    (body as { code?: string } | null)?.code;
  if (typeof raw === "string" && raw !== "") {
    return raw.split(":")[0].split("#").pop() ?? raw;
  }
  if (response.status === 403) return "AccessDeniedException";
  if (response.status === 429) return "ThrottlingException";
  return response.status >= 500
    ? "InternalServerException"
    : "ParticipantRequestError";
};

/**
 * A browser `fetch` implementation of the Amazon Connect Participant Service
 * operations ChatJS uses. Mirrors the bundled AWS client: the same REST
 * operations and headers, idempotency tokens for writes, retries for
 * throttling, server and network errors, and leading-edge typing throttling.
 *
 * Touchpoint uses it only when it must supply ChatJS a client of its own, such
 * as to reuse the connection returned by StartChatContact.
 */
export class ParticipantServiceClient extends connect.ChatSession.ChatClient {
  private readonly maxAttempts: number;
  private readonly timeoutMs: number;
  private lastTypingAt = Number.NEGATIVE_INFINITY;
  private lastTyping?: Promise<{ data: connect.SendEventResult }>;

  /**
   * @param endpoint - Participant Service base URL, e.g. `https://participant.connect.us-west-2.amazonaws.com`
   * @param options - retry and timeout settings
   */
  constructor(
    private readonly endpoint: string,
    options: ParticipantServiceClientOptions = {},
  ) {
    super();
    this.endpoint = endpoint.replace(/\/+$/, "");
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  private async attempt<Result>(
    operation: string,
    method: "GET" | "POST",
    path: string,
    token: string | null,
    body: object | undefined,
  ): Promise<{ data: Result }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetch(`${this.endpoint}${path}`, {
          method,
          credentials: "omit",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            ...(body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
            "X-Amz-Bearer": token ?? "",
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
      } catch {
        throw participantError(
          operation,
          controller.signal.aborted ? "TimeoutError" : "NetworkingError",
          `${operation} could not reach the participant service`,
        );
      }
      const text = await response.text().catch(() => "");
      let parsed: unknown = {};
      try {
        parsed = text !== "" ? JSON.parse(text) : {};
      } catch {
        if (response.ok) {
          throw participantError(
            operation,
            "SerializationException",
            `${operation} returned an unreadable response`,
            response.status,
          );
        }
      }
      if (!response.ok) {
        // Never echo the service's message or body: it may describe tokens.
        throw participantError(
          operation,
          errorTypeFrom(response, parsed),
          `${operation} failed (HTTP ${response.status})`,
          response.status,
        );
      }
      return { data: parsed as Result };
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<Result>(
    operation: string,
    method: "GET" | "POST",
    path: string,
    token: string | null,
    body?: object,
  ): Promise<{ data: Result }> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.attempt<Result>(operation, method, path, token, body);
      } catch (error) {
        if (attempt >= this.maxAttempts || !retryable(error)) throw error;
        const delay = Math.random() * Math.min(2000, 100 * 2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /** CreateParticipantConnection, authorized by the participant token. */
  createParticipantConnection(
    participantToken: string | null,
    type: string[] | null,
    acknowledgeConnection: boolean | null,
  ): Promise<{ data: connect.CreateParticipantConnectionResult }> {
    return this.request(
      "CreateParticipantConnection",
      "POST",
      "/participant/connection",
      participantToken,
      {
        ...(type != null ? { Type: type } : {}),
        ...(acknowledgeConnection != null
          ? { ConnectParticipant: acknowledgeConnection }
          : {}),
      },
    );
  }

  /** DisconnectParticipant, which ends the customer's part in the contact. */
  disconnectParticipant(
    connectionToken: string | null,
  ): Promise<{ data: unknown }> {
    return this.request(
      "DisconnectParticipant",
      "POST",
      "/participant/disconnect",
      connectionToken,
      { ClientToken: newClientToken() },
    );
  }

  /** SendMessage; generates the idempotency token when ChatJS supplies none. */
  sendMessage(
    connectionToken: string | null,
    content: string,
    contentType: string,
    clientToken?: string,
  ): Promise<{ data: connect.SendMessageResult }> {
    return this.request(
      "SendMessage",
      "POST",
      "/participant/message",
      connectionToken,
      {
        Content: content,
        ContentType: contentType,
        ClientToken: clientToken ?? newClientToken(),
      },
    );
  }

  /** SendEvent. Typing events are sent at most once per ten seconds. */
  sendEvent(
    connectionToken: string | null,
    contentType: string,
    content: string,
    clientToken?: string,
  ): Promise<{ data: connect.SendEventResult }> {
    const submit = () =>
      this.request<connect.SendEventResult>(
        "SendEvent",
        "POST",
        "/participant/event",
        connectionToken,
        {
          ContentType: contentType,
          ...(content != null ? { Content: content } : {}),
          ClientToken: clientToken ?? newClientToken(),
        },
      );
    if (contentType !== TYPING_CONTENT_TYPE) return submit();
    const now = Date.now();
    if (
      this.lastTyping != null &&
      now - this.lastTypingAt < TYPING_VALIDITY_MS
    ) {
      return this.lastTyping;
    }
    this.lastTypingAt = now;
    this.lastTyping = submit();
    return this.lastTyping;
  }

  /** GetTranscript, mapping ChatJS's camelCase arguments to the API's fields. */
  getTranscript(
    connectionToken: string | null,
    args: connect.GetTranscriptArgs,
  ): Promise<{ data: connect.GetTranscriptResult }> {
    return this.request(
      "GetTranscript",
      "POST",
      "/participant/transcript",
      connectionToken,
      {
        ...(args.contactId != null && args.contactId !== ""
          ? { ContactId: args.contactId }
          : {}),
        MaxResults: args.maxResults,
        NextToken: args.nextToken,
        ScanDirection: args.scanDirection,
        SortOrder: args.sortOrder,
        ...(args.startPosition != null
          ? {
              StartPosition: {
                Id: args.startPosition.id,
                AbsoluteTime: args.startPosition.absoluteTime,
                MostRecent: args.startPosition.mostRecent,
              },
            }
          : {}),
      },
    );
  }

  /** StartAttachmentUpload, the pre-signed upload, then CompleteAttachmentUpload. */
  async sendAttachment(
    connectionToken: string | null,
    attachment: File | Blob,
  ): Promise<{ data: unknown }> {
    const started = await this.request<{
      AttachmentId: string;
      UploadMetadata: {
        Url: string;
        HeadersToInclude?: Record<string, string>;
      };
    }>(
      "StartAttachmentUpload",
      "POST",
      "/participant/start-attachment-upload",
      connectionToken,
      {
        ContentType: attachment.type,
        AttachmentName: (attachment as File).name,
        AttachmentSizeInBytes: attachment.size,
        ClientToken: newClientToken(),
      },
    );
    const upload = await fetch(started.data.UploadMetadata.Url, {
      method: "PUT",
      headers: started.data.UploadMetadata.HeadersToInclude,
      body: attachment,
    });
    if (!upload.ok) {
      throw participantError(
        "UploadAttachment",
        "AttachmentUploadError",
        `UploadAttachment failed (HTTP ${upload.status})`,
        upload.status,
      );
    }
    return this.request(
      "CompleteAttachmentUpload",
      "POST",
      "/participant/complete-attachment-upload",
      connectionToken,
      {
        AttachmentIds: [started.data.AttachmentId],
        ClientToken: newClientToken(),
      },
    );
  }

  /** GetAttachment, resolving to the pre-signed download URL. */
  async getAttachmentURL(
    connectionToken: string | null,
    attachmentId: string,
  ): Promise<string> {
    const result = await this.request<{ Url: string }>(
      "GetAttachment",
      "POST",
      "/participant/attachment",
      connectionToken,
      { AttachmentId: attachmentId },
    );
    return result.data.Url;
  }

  /** GetAttachment, then downloads the attachment bytes. */
  async downloadAttachment(
    connectionToken: string | null,
    attachmentId: string,
  ): Promise<Blob> {
    const url = await this.getAttachmentURL(connectionToken, attachmentId);
    const response = await fetch(url);
    if (!response.ok) {
      throw participantError(
        "DownloadAttachment",
        "AttachmentDownloadError",
        `DownloadAttachment failed (HTTP ${response.status})`,
        response.status,
      );
    }
    return response.blob();
  }

  /** DescribeView for a View token received in the chat. */
  describeView(
    viewToken: string,
    connectionToken: string | null,
  ): Promise<{ data: connect.DescribeViewResult }> {
    return this.request(
      "DescribeView",
      "GET",
      `/participant/views/${encodeURIComponent(viewToken)}`,
      connectionToken,
    );
  }

  /** GetAuthenticationUrl for the Authenticate Customer flow block. */
  getAuthenticationUrl(
    connectionToken: string | null,
    redirectUri: string,
    sessionId: string,
  ): Promise<{ data: connect.GetAuthenticationUrlResult }> {
    return this.request(
      "GetAuthenticationUrl",
      "POST",
      "/participant/authentication-url",
      connectionToken,
      { RedirectUri: redirectUri, SessionId: sessionId },
    );
  }

  /** CancelParticipantAuthentication. */
  cancelParticipantAuthentication(
    connectionToken: string | null,
    sessionId: string,
  ): Promise<{ data: unknown }> {
    return this.request(
      "CancelParticipantAuthentication",
      "POST",
      "/participant/cancel-authentication",
      connectionToken,
      { SessionId: sessionId },
    );
  }
}
