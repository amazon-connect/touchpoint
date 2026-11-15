import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { ResponseType, type Response } from "../core";

const chat = vi.hoisted(() => ({
  create: vi.fn(),
  setGlobalConfig: vi.fn(),
}));

vi.mock("amazon-connect-chatjs", () => {
  Object.assign(window, {
    connect: {
      ChatSession: {
        ChatClient: Object,
        SessionTypes: { CUSTOMER: "CUSTOMER" },
        create: chat.create,
        setGlobalConfig: chat.setGlobalConfig,
      },
    },
  });
  return {};
});

import {
  createConnectChatConversation,
  type ConnectChatConfig,
  type ConnectConversationHandler,
} from "./conversation";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const fakeSession = () => {
  const connection = deferred<undefined>();
  let receive: (event: { data: Record<string, unknown> }) => void = () => {};
  let transcriptUpdated: (event: {
    data: { transcript: Array<Record<string, unknown>> };
  }) => void = () => {};
  let established = () => {};
  let broken = () => {};
  let ended = () => {};
  const session = {
    connect: vi.fn(() => connection.promise),
    disconnectParticipant: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn(() => Promise.resolve({ data: { Id: "server-id" } })),
    sendAttachment: vi.fn(() => Promise.resolve()),
    onTranscriptUpdated: vi.fn((callback: typeof transcriptUpdated) => {
      transcriptUpdated = callback;
    }),
    onMessage: vi.fn((callback: typeof receive) => {
      receive = callback;
    }),
    onConnectionEstablished: vi.fn((callback: typeof established) => {
      established = callback;
    }),
    onConnectionBroken: vi.fn((callback: typeof broken) => {
      broken = callback;
    }),
    onEnded: vi.fn((callback: typeof ended) => {
      ended = callback;
    }),
    onTyping: vi.fn(),
    onDeliveredReceipt: vi.fn(),
    onReadReceipt: vi.fn(),
  };
  return {
    ...session,
    connection,
    establish: () => {
      established();
      connection.resolve(undefined);
    },
    breakConnection: () => {
      broken();
    },
    end: () => {
      ended();
    },
    receive: (data: Record<string, unknown>) => {
      receive({ data });
    },
    receiveTranscript: (transcript: Array<Record<string, unknown>>) => {
      transcriptUpdated({ data: { transcript } });
    },
  };
};

const flush = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

const endConversation = (handler: ConnectConversationHandler) => {
  if (
    !("endConversation" in handler) ||
    typeof handler.endConversation !== "function"
  ) {
    throw new Error("The Connect handler does not expose endConversation.");
  }
  handler.endConversation();
};

/** The Connect-only methods the handler adds to the `core` interface. */
const connectOnly = (handler: ConnectConversationHandler) =>
  handler as ConnectConversationHandler & {
    sendAttachment: (file: File) => Promise<void>;
    describeView: (viewToken: string) => Promise<unknown>;
  };

describe("outgoing chat readiness", () => {
  let session: ReturnType<typeof fakeSession>;
  let handler: ConnectConversationHandler;
  let responses: Response[];
  let fetchMock: Mock<(url: string) => Promise<globalThis.Response>>;

  // The Participant Service calls a teardown makes when ChatJS has no open
  // socket of its own to disconnect.
  const participantCalls = (path: string) =>
    fetchMock.mock.calls.filter(([url]) => url.endsWith(path));

  const start = (overrides: Partial<ConnectChatConfig> = {}) => {
    handler = createConnectChatConversation({
      details: {
        contactId: "test-contact",
        participantId: "test-customer",
        participantToken: "synthetic-test-token",
      },
      initialResponseTimeoutMs: 1000,
      ...overrides,
    });
    handler.subscribe((next) => {
      responses = next;
    });
    return handler;
  };

  const userResponses = () =>
    responses.filter((response) => response.type === ResponseType.User);

  const greeting = () => {
    session.receive({
      ParticipantRole: "SYSTEM",
      ContentType: "text/plain",
      Content: "How can I help?",
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    session = fakeSession();
    chat.create.mockReturnValue(session);
    responses = [];
    fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/participant/connection")
        ? new Response(
            JSON.stringify({
              ConnectionCredentials: {
                ConnectionToken: "fresh-token",
                Expiry: new Date(Date.now() + 60_000).toISOString(),
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          )
        : new Response("{}", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    handler?.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps customer-first flows unchanged when the option is unset", async () => {
    start({ initialResponseTimeoutMs: undefined }).sendText("Hello");
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    session.establish();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "Hello",
    });
  });

  it("reports transport readiness while the first message still waits for the assistant", async () => {
    const observe = vi.fn();
    start({ onConnectionStateChange: observe }).sendText("Hello");
    expect(observe).toHaveBeenLastCalledWith("connecting");
    await flush();
    session.establish();
    await flush();
    expect(observe).toHaveBeenLastCalledWith("connected");
    expect(session.sendMessage).not.toHaveBeenCalled();
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledTimes(1);
    session.breakConnection();
    expect(observe).toHaveBeenLastCalledWith("disconnected");
  });

  it("ignores connection events from a replaced session", async () => {
    const observe = vi.fn();
    start({ onConnectionStateChange: observe });
    await flush();
    const previous = session;
    session = fakeSession();
    chat.create.mockReturnValue(session);
    handler.reset();
    await flush();
    observe.mockClear();
    previous.establish();
    previous.breakConnection();
    previous.end();
    expect(observe).not.toHaveBeenCalled();
    session.establish();
    expect(observe).toHaveBeenCalledExactlyOnceWith("connected");
  });

  it("keeps message delivery working when the connection observer throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    start({
      onConnectionStateChange: () => {
        throw new Error("consumer observer failed");
      },
    }).sendText("Hello");
    await flush();
    session.establish();
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "Hello",
    });
  });

  it("keeps an early message visible and pending until the assistant is ready", async () => {
    start().sendText("Hello");
    expect(userResponses()).toMatchObject([
      { payload: { text: "Hello" }, status: "sending" },
    ]);
    await flush();
    session.establish();
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "Hello",
    });
    expect(userResponses()).toMatchObject([{ status: "sent" }]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("still waits for the participant connection when the greeting arrives first", async () => {
    start().sendText("Hello");
    await flush();
    greeting();
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    session.establish();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledTimes(1);
  });

  const storedGreeting = {
    Id: "greeting-id",
    Type: "MESSAGE",
    ParticipantRole: "SYSTEM",
    ContentType: "text/plain",
    Content: "How can I help?",
  };

  it("recovers a greeting sent before the socket subscribed and releases the queued message once", async () => {
    start().sendText("Hello");
    await flush();
    session.establish();
    await flush();

    expect(session.onTranscriptUpdated).toHaveBeenCalledTimes(1);
    expect(session.sendMessage).not.toHaveBeenCalled();
    session.receiveTranscript([storedGreeting]);
    await flush();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "Hello",
    });
  });

  it.each(["socket-first", "transcript-first"])(
    "renders a greeting once when recovery overlaps delivery (%s)",
    async (order) => {
      start().sendText("Hello");
      await flush();
      session.establish();
      await flush();
      if (order === "socket-first") session.receive(storedGreeting);
      session.receiveTranscript([storedGreeting]);
      await flush();
      if (order === "transcript-first") session.receive(storedGreeting);
      await flush();

      expect(
        responses.filter(
          (response) => response.type === ResponseType.Application,
        ),
      ).toHaveLength(1);
      expect(session.sendMessage).toHaveBeenCalledTimes(1);
    },
  );

  it("does not add a transcript request to customer-first startup", async () => {
    start({ initialResponseTimeoutMs: undefined }).sendText("Hello");
    await flush();
    session.establish();
    await flush();
    expect(session.onTranscriptUpdated).not.toHaveBeenCalled();
  });

  const applicationTexts = () =>
    responses
      .filter((response) => response.type === ResponseType.Application)
      .map((response) => response.payload.messages[0].text);

  it("replaces a message in place when its content changes", async () => {
    start();
    await flush();
    session.receive(storedGreeting);
    session.receive({ ...storedGreeting, Content: "An updated greeting" });
    expect(applicationTexts()).toEqual(["An updated greeting"]);
  });

  it("renders one message when the stored and live payloads differ in shape", async () => {
    start();
    await flush();
    session.establish();
    await flush();
    // What GetTranscript stores: no `Attachments` key at all, and a `Type`.
    session.receiveTranscript([
      {
        Id: "greeting-id",
        Type: "MESSAGE",
        ParticipantRole: "SYSTEM",
        ContentType: "text/plain",
        Content: "How can I help?",
        AbsoluteTime: "2026-01-01T00:00:00.000Z",
      },
    ]);
    // What the websocket delivers: an empty `Attachments` array and fields of
    // its own.
    session.receive({
      Id: "greeting-id",
      ParticipantRole: "SYSTEM",
      ContentType: "text/plain",
      Content: "How can I help?",
      Attachments: [],
      DisplayName: "Assistant",
      ParticipantId: "assistant-1",
    });
    await flush();
    expect(applicationTexts()).toEqual(["How can I help?"]);
  });

  it("processes the whole recovered transcript after the gate opens", async () => {
    start();
    await flush();
    session.establish();
    await flush();
    session.receiveTranscript([
      storedGreeting,
      {
        Id: "second-id",
        Type: "MESSAGE",
        ParticipantRole: "SYSTEM",
        ContentType: "text/plain",
        Content: "Anything else?",
      },
    ]);
    await flush();
    expect(applicationTexts()).toEqual(["How can I help?", "Anything else?"]);
  });

  it("recovers the transcript of a prefetched chat with no greeting gate", async () => {
    start({
      initialResponseTimeoutMs: undefined,
      details: {
        contactId: "test-contact",
        participantId: "test-customer",
        participantToken: "synthetic-test-token",
        initialConnection: {
          websocketUrl: "wss://socket.example/x",
          websocketExpiry: new Date(Date.now() + 60_000).toISOString(),
          connectionToken: "connection-token",
          connectionTokenExpiry: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    });
    await flush();
    session.establish();
    await flush();
    expect(session.onTranscriptUpdated).toHaveBeenCalledTimes(1);
    session.receiveTranscript([storedGreeting]);
    await flush();
    expect(applicationTexts()).toEqual(["How can I help?"]);
  });

  it("keeps waiting for a live greeting when no greeting is in the transcript", async () => {
    start().sendText("Hello");
    await flush();
    session.establish();
    session.receiveTranscript([]);
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("ignores recovered messages from an ended or restarted session", async () => {
    start().sendText("Old");
    await flush();
    session.establish();
    await flush();
    const previous = session;
    session = fakeSession();
    chat.create.mockReturnValue(session);
    handler.reset({ clearResponses: true });
    handler.sendText("New");
    await flush();
    session.establish();
    previous.receiveTranscript([storedGreeting]);
    await flush();

    expect(previous.sendMessage).not.toHaveBeenCalled();
    expect(session.sendMessage).not.toHaveBeenCalled();
    expect(
      responses.filter(
        (response) => response.type === ResponseType.Application,
      ),
    ).toHaveLength(0);
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "New",
    });
  });

  it("ignores customer echoes, blank messages, typing and participant events", async () => {
    start().sendText("Hello");
    await flush();
    session.establish();
    for (const data of [
      {
        ParticipantRole: "CUSTOMER",
        ContentType: "text/plain",
        Content: "Hello",
      },
      {
        ParticipantRole: "SYSTEM",
        ContentType: "text/plain",
        Content: " \n ",
      },
      {
        ParticipantRole: "AGENT",
        ContentType: "application/vnd.amazonaws.connect.event.typing",
        Content: "typing",
      },
      {
        ParticipantRole: "AGENT",
        ContentType:
          "application/vnd.amazonaws.connect.event.participant.joined",
        Content: "joined",
      },
      {
        ParticipantRole: "SYSTEM",
        ContentType: "application/vnd.amazonaws.connect.message.interactive",
        Content: JSON.stringify({
          templateType: "TouchpointModality",
          data: {
            content: {
              modalityPayload: { type: "interim", message: "Thinking" },
            },
          },
        }),
      },
    ]) {
      session.receive(data);
    }
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["text/markdown", "**Welcome**"],
    ["application/json", JSON.stringify({ messages: [{ text: "Welcome" }] })],
    [
      "application/vnd.amazonaws.connect.message.interactive",
      JSON.stringify({
        templateType: "QuickReply",
        data: {
          content: { title: "Welcome", replies: [{ title: "Continue" }] },
        },
      }),
    ],
  ])("accepts an opening %s turn", async (contentType, content) => {
    start().sendText("Hello");
    await flush();
    session.establish();
    session.receive({
      ParticipantRole: "SYSTEM",
      ContentType: contentType,
      Content: content,
    });
    await flush();
    expect(session.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("dispatches each queued message once, even after repeated greetings", async () => {
    start().sendText("First");
    handler.sendText("Second");
    await flush();
    session.establish();
    greeting();
    greeting();
    await flush();
    handler.sendText("Third");
    await flush();
    expect(session.sendMessage.mock.calls).toEqual([
      [{ contentType: "text/plain", message: "First" }],
      [{ contentType: "text/plain", message: "Second" }],
      [{ contentType: "text/plain", message: "Third" }],
    ]);
    expect(userResponses().map((response) => response.status)).toEqual([
      "sent",
      "sent",
      "sent",
    ]);
  });

  it("times out visibly without sending or replaying the failed messages", async () => {
    start().sendText("First");
    handler.sendText("Second");
    await flush();
    session.establish();
    await vi.advanceTimersByTimeAsync(1000);
    expect(session.sendMessage).not.toHaveBeenCalled();
    expect(userResponses().map((response) => response.status)).toEqual([
      "failed",
      "failed",
    ]);
    expect(
      responses.filter((response) => response.type === ResponseType.Failure),
    ).toMatchObject([
      {
        payload: { text: expect.stringContaining("Your message was not sent") },
      },
    ]);
    greeting();
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    handler.sendText("Retry after greeting");
    await flush();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "Retry after greeting",
    });
  });

  it("fails a queued send when connecting rejects", async () => {
    start().sendText("Hello");
    await flush();
    session.connection.reject(new Error("Connection refused"));
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    expect(userResponses()).toMatchObject([{ status: "failed" }]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("fails a queued send if the connection breaks before the greeting", async () => {
    start().sendText("Hello");
    await flush();
    session.establish();
    session.breakConnection();
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    expect(userResponses()).toMatchObject([{ status: "failed" }]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never transfers old queued messages into a restarted contact", async () => {
    start().sendText("Old");
    await flush();
    session.establish();
    const oldSession = session;
    session = fakeSession();
    chat.create.mockReturnValue(session);
    handler.reset({ clearResponses: true });
    handler.sendText("New");
    await flush();
    oldSession.receive({
      ParticipantRole: "SYSTEM",
      ContentType: "text/plain",
      Content: "Old greeting",
    });
    session.establish();
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    greeting();
    await flush();
    expect(oldSession.sendMessage).not.toHaveBeenCalled();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "New",
    });
    expect(userResponses()).toMatchObject([{ payload: { text: "New" } }]);
  });

  it("ignores stale chat details resolving after a restart", async () => {
    const oldDetails = deferred<{
      contactId: string;
      participantId: string;
      participantToken: string;
    }>();
    const details = vi
      .fn()
      .mockReturnValueOnce(oldDetails.promise)
      .mockResolvedValue({
        contactId: "new-contact",
        participantId: "new-customer",
        participantToken: "synthetic-new-token",
      });
    start({ details }).sendText("Old");
    handler.reset({ clearResponses: true });
    await flush();
    oldDetails.resolve({
      contactId: "old-contact",
      participantId: "old-customer",
      participantToken: "synthetic-old-token",
    });
    await flush();
    expect(chat.create).toHaveBeenCalledTimes(1);
    expect(handler.currentConversationId()).toBe("new-contact");
    expect(session.sendMessage).not.toHaveBeenCalled();
  });

  const teardown = (operation: "destroy" | "endConversation" | "reset") => {
    if (operation === "destroy") handler.destroy();
    else if (operation === "reset") handler.reset({ clearResponses: true });
    else endConversation(handler);
  };

  it.each(["destroy", "endConversation"] as const)(
    "%s cancels the queue before the connection completes",
    async (operation) => {
      start().sendText("Hello");
      await flush();
      teardown(operation);
      session.establish();
      greeting();
      await vi.advanceTimersByTimeAsync(2000);
      expect(session.sendMessage).not.toHaveBeenCalled();
      expect(userResponses()).toMatchObject([{ status: "failed" }]);
    },
  );

  it.each(["destroy", "endConversation", "reset"] as const)(
    "%s ends a contact whose socket has not opened yet",
    async (operation) => {
      start();
      await flush();
      expect(chat.create).toHaveBeenCalledTimes(1);
      teardown(operation);
      await flush();

      // No ChatJS session to disconnect through, so the contact is ended with a
      // connection token of its own.
      expect(session.disconnectParticipant).not.toHaveBeenCalled();
      expect(participantCalls("/participant/connection")).toHaveLength(1);
      const [disconnect] = participantCalls("/participant/disconnect");
      expect(disconnect?.[0]).toBe(
        "https://participant.connect.us-west-2.api.aws/participant/disconnect",
      );
      expect(participantCalls("/participant/disconnect")).toHaveLength(1);
    },
  );

  it("ends a contact created after the conversation was torn down", async () => {
    const pending = deferred<{
      contactId: string;
      participantId: string;
      participantToken: string;
    }>();
    start({ details: () => pending.promise });
    endConversation(handler);
    await flush();
    pending.resolve({
      contactId: "late-contact",
      participantId: "late-customer",
      participantToken: "synthetic-late-token",
    });
    await flush();

    // The contact exists even though no chat session was ever created for it.
    expect(chat.create).not.toHaveBeenCalled();
    expect(participantCalls("/participant/disconnect")).toHaveLength(1);
  });

  it("ends a connected contact through ChatJS, and only once", async () => {
    start();
    await flush();
    session.establish();
    await flush();
    endConversation(handler);
    handler.destroy();
    await flush();

    expect(session.disconnectParticipant).toHaveBeenCalledTimes(1);
    expect(participantCalls("/participant/disconnect")).toHaveLength(0);
  });

  it("ends a connecting contact only once across repeated teardowns", async () => {
    start();
    await flush();
    endConversation(handler);
    handler.destroy();
    await flush();

    expect(participantCalls("/participant/disconnect")).toHaveLength(1);
  });

  it("does not disconnect again after the remote contact ends", async () => {
    start();
    await flush();
    session.establish();
    await flush();
    session.end();
    handler.destroy();
    await flush();

    expect(session.disconnectParticipant).not.toHaveBeenCalled();
    expect(participantCalls("/participant/disconnect")).toHaveLength(0);
  });

  it("holds an attachment until the assistant's opening turn", async () => {
    start();
    const upload = connectOnly(handler).sendAttachment(
      new File(["hello"], "hello.txt", { type: "text/plain" }),
    );
    void upload.catch(() => {});
    await flush();
    session.establish();
    await flush();
    expect(session.sendAttachment).not.toHaveBeenCalled();
    greeting();
    await flush();
    expect(session.sendAttachment).toHaveBeenCalledTimes(1);
  });

  it("lets a send wait again after the socket reconnects", async () => {
    start().sendText("Hello");
    await flush();
    session.establish();
    session.breakConnection();
    await flush();
    expect(userResponses()).toMatchObject([{ status: "failed" }]);

    session.establish();
    handler.sendText("After reconnecting");
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "After reconnecting",
    });
  });

  it("keeps the chat usable for later sends once the deadline passes", async () => {
    start().sendText("Hello");
    await flush();
    session.establish();
    await vi.advanceTimersByTimeAsync(1000);
    expect(session.sendMessage).not.toHaveBeenCalled();
    expect(userResponses()).toMatchObject([{ status: "failed" }]);

    // No greeting ever arrives, but the customer is not locked out.
    handler.sendText("Second try");
    await flush();
    expect(session.sendMessage).toHaveBeenCalledExactlyOnceWith({
      contentType: "text/plain",
      message: "Second try",
    });
  });

  it("resolves describeView as unavailable when connecting fails", async () => {
    start();
    await flush();
    session.connection.reject(new Error("Connection refused"));
    await flush();
    await expect(
      connectOnly(handler).describeView("view-token"),
    ).resolves.toBeNull();
  });

  it("cancels the queue when the remote contact ends", async () => {
    start().sendText("Hello");
    await flush();
    session.establish();
    session.end();
    greeting();
    await flush();
    expect(session.sendMessage).not.toHaveBeenCalled();
    expect(userResponses()).toMatchObject([{ status: "failed" }]);
  });

  it("reports a send rejection without automatically retrying", async () => {
    session.sendMessage.mockRejectedValue(new Error("Service unavailable"));
    start().sendText("Hello");
    await flush();
    session.establish();
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledTimes(1);
    expect(userResponses()).toMatchObject([{ status: "failed" }]);
  });

  it("keeps a real acknowledgement when the user ends an in-flight send", async () => {
    const acknowledgement = deferred<{ data: { Id: string } }>();
    session.sendMessage.mockReturnValue(acknowledgement.promise);
    start().sendText("Hello");
    await flush();
    session.establish();
    greeting();
    await flush();
    expect(session.sendMessage).toHaveBeenCalledTimes(1);
    endConversation(handler);
    expect(userResponses()).toMatchObject([{ status: "sending" }]);
    acknowledgement.resolve({ data: { Id: "accepted-before-ending" } });
    await flush();
    expect(userResponses()).toMatchObject([{ status: "sent" }]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 2147483648])(
    "rejects an invalid initial-response deadline (%s) before connecting",
    (initialResponseTimeoutMs) => {
      expect(() => {
        start({ initialResponseTimeoutMs });
      }).toThrow("initialResponseTimeoutMs");
      expect(chat.create).not.toHaveBeenCalled();
    },
  );
});
