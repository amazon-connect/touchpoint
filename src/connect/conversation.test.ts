import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("outgoing chat readiness", () => {
  let session: ReturnType<typeof fakeSession>;
  let handler: ConnectConversationHandler;
  let responses: Response[];

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
  });

  afterEach(() => {
    handler?.destroy();
    vi.useRealTimers();
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

  it("preserves changed content with the same message ID", async () => {
    start();
    await flush();
    session.receive(storedGreeting);
    session.receive({ ...storedGreeting, Content: "An updated greeting" });
    expect(
      responses
        .filter((response) => response.type === ResponseType.Application)
        .map((response) => response.payload.messages[0].text),
    ).toEqual(["How can I help?", "An updated greeting"]);
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

  it.each(["destroy", "endConversation"] as const)(
    "%s cancels the queue before the connection completes",
    async (operation) => {
      start().sendText("Hello");
      await flush();
      if (operation === "destroy") handler.destroy();
      else endConversation(handler);
      session.establish();
      greeting();
      await vi.advanceTimersByTimeAsync(2000);
      expect(session.sendMessage).not.toHaveBeenCalled();
      expect(userResponses()).toMatchObject([{ status: "failed" }]);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

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
