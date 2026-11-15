import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

type FetchMock = Mock<(url: string, init?: RequestInit) => Promise<Response>>;

const chat = vi.hoisted(() => ({
  create: vi.fn(),
  setGlobalConfig: vi.fn(),
}));

vi.mock("amazon-connect-chatjs", () => {
  class ChatClient {
    readonly base = true;
  }
  Object.assign(window, {
    connect: {
      ChatSession: {
        ChatClient,
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
  fetchChatDetails,
  type ChatDetails,
  type ConnectConversationHandler,
} from "./conversation";
import { prefetchChatDetails } from "./index";
import { InitialConnectionChatClient } from "./initialConnection";
import { ParticipantServiceClient } from "./participantClient";

const later = (ms: number) => new Date(Date.now() + ms).toISOString();

const startChatResult = {
  ContactId: "contact",
  ParticipantId: "participant",
  ParticipantToken: "participant-token",
  Websocket: { Url: "wss://socket.example/x", ConnectionExpiry: later(60_000) },
  ConnectionCredentials: {
    ConnectionToken: "connection-token",
    Expiry: later(3_600_000),
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const session = () => ({
  connect: vi.fn(() => new Promise(() => {})),
  disconnectParticipant: vi.fn(),
  onMessage: vi.fn(),
  onConnectionEstablished: vi.fn(),
  onConnectionBroken: vi.fn(),
  onEnded: vi.fn(),
  onTyping: vi.fn(),
  onDeliveredReceipt: vi.fn(),
  onReadReceipt: vi.fn(),
});

describe("fetchChatDetails", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => json({ data: { startChatResult } }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const body = () =>
    JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);

  it("asks for the connection and returns it when requested", async () => {
    const details = await fetchChatDetails("https://start", {
      requestInitialConnection: true,
    });

    expect(body().ConnectionTypes).toEqual([
      "WEBSOCKET",
      "CONNECTION_CREDENTIALS",
    ]);
    expect(details).toEqual({
      contactId: "contact",
      participantId: "participant",
      participantToken: "participant-token",
      initialConnection: {
        websocketUrl: "wss://socket.example/x",
        websocketExpiry: startChatResult.Websocket.ConnectionExpiry,
        connectionToken: "connection-token",
        connectionTokenExpiry: startChatResult.ConnectionCredentials.Expiry,
      },
    });
  });

  it("keeps today's request and ignores returned credentials by default", async () => {
    const details = await fetchChatDetails("https://start", {});

    expect(body()).not.toHaveProperty("ConnectionTypes");
    expect(details).not.toHaveProperty("initialConnection");
  });

  it("falls back to the ordinary connection when an endpoint drops ConnectionTypes", async () => {
    fetchMock.mockResolvedValue(
      json({
        data: {
          startChatResult: {
            ContactId: "c",
            ParticipantId: "p",
            ParticipantToken: "t",
          },
        },
      }),
    );
    const details = await fetchChatDetails("https://start", {
      requestInitialConnection: true,
    });

    expect(details).toEqual({
      contactId: "c",
      participantId: "p",
      participantToken: "t",
    });
  });
});

describe("chat session transport", () => {
  let handler: ConnectConversationHandler | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    chat.create.mockReturnValue(session());
  });

  afterEach(() => handler?.destroy());

  const created = async (details: ChatDetails, extra = {}) => {
    handler = createConnectChatConversation({
      details,
      globalConfig: {
        endpoint: "https://participant.connect-gamma.us-west-2.api.aws",
      },
      ...extra,
    });
    await vi.waitFor(() => expect(chat.create).toHaveBeenCalled());
    return chat.create.mock.calls[0][0];
  };

  const initialConnection = {
    websocketUrl: "wss://socket.example/x",
    websocketExpiry: later(60_000),
    connectionToken: "connection-token",
    connectionTokenExpiry: later(3_600_000),
  };

  it("uses ChatJS's bundled client when there is no initial connection", async () => {
    const args = await created({
      contactId: "c",
      participantId: "p",
      participantToken: "t",
    });

    expect(args.options).toBeUndefined();
    expect(args.chatDetails).toEqual({
      contactId: "c",
      participantId: "p",
      participantToken: "t",
    });
  });

  it("answers the first connection with the initial connection", async () => {
    const args = await created({
      contactId: "c",
      participantId: "p",
      participantToken: "t",
      initialConnection,
    });

    const client = args.options.customChatClient as InitialConnectionChatClient;
    expect(client).toBeInstanceOf(InitialConnectionChatClient);
    expect(args.chatDetails).not.toHaveProperty("initialConnection");
    const connection = await client.createParticipantConnection(
      "t",
      ["WEBSOCKET", "CONNECTION_CREDENTIALS"],
      null,
    );
    expect(connection.data.ConnectionCredentials?.ConnectionToken).toBe(
      "connection-token",
    );
    expect((client as unknown as { inner: unknown }).inner).toBeInstanceOf(
      ParticipantServiceClient,
    );
  });

  it("wraps a configured custom client instead of replacing it", async () => {
    const custom = new ParticipantServiceClient("https://proxy.example");
    const args = await created(
      { contactId: "c", participantId: "p", initialConnection },
      { customChatClient: custom },
    );

    expect((args.options.customChatClient as { inner: unknown }).inner).toBe(
      custom,
    );
  });
});

describe("prefetchChatDetails", () => {
  let fetchMock: FetchMock;
  const config = {
    chatEndpoint: "https://start",
    requestInitialConnection: true,
    region: "us-west-2",
    globalConfig: { endpoint: "https://participant.example" },
  };

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) =>
      url === "https://start" ? json({ data: { startChatResult } }) : json({}),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const starts = () =>
    fetchMock.mock.calls.filter(([url]) => url === "https://start").length;

  it("starts the chat at once and hands it to Touchpoint exactly once", async () => {
    const prefetched = prefetchChatDetails(config);
    expect(starts()).toBe(1);

    const first = await prefetched.details();
    expect(first.initialConnection?.connectionToken).toBe("connection-token");
    expect(starts()).toBe(1);

    await prefetched.details();
    expect(starts()).toBe(2);
  });

  it("surfaces a failed prefetch without automatically creating another contact", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 500));
    const prefetched = prefetchChatDetails(config);

    await expect(prefetched.details()).rejects.toThrow(
      "StartChatContact endpoint returned 500",
    );
    expect(starts()).toBe(1);

    // An explicit new conversation can start a fresh contact.
    await expect(prefetched.details()).resolves.toMatchObject({
      contactId: "contact",
    });
    expect(starts()).toBe(2);
  });

  it("ends an untaken chat with its initial connection token", async () => {
    const prefetched = prefetchChatDetails(config);
    await prefetched.cancel();

    const disconnect = fetchMock.mock.calls.find(([url]) =>
      url.endsWith("/participant/disconnect"),
    );
    expect(disconnect?.[0]).toBe(
      "https://participant.example/participant/disconnect",
    );
    expect((disconnect?.[1] as RequestInit).headers).toMatchObject({
      "X-Amz-Bearer": "connection-token",
    });
    await expect(prefetched.details()).rejects.toThrow(
      "The prefetched chat was canceled.",
    );
    expect(starts()).toBe(1);
  });

  it("cancels ownership before an in-flight start request resolves", async () => {
    let resolveStart!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveStart = resolve;
      }),
    );
    const prefetched = prefetchChatDetails(config);
    const canceled = prefetched.cancel();

    await expect(prefetched.details()).rejects.toThrow(
      "The prefetched chat was canceled.",
    );
    resolveStart(json({ data: { startChatResult } }));
    await canceled;

    expect(starts()).toBe(1);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        url.endsWith("/participant/disconnect"),
      ),
    ).toHaveLength(1);
  });

  it("connects first to end an untaken chat without an initial connection", async () => {
    const prefetched = prefetchChatDetails({
      ...config,
      requestInitialConnection: false,
    });
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/participant/connection")
        ? json({
            ConnectionCredentials: {
              ConnectionToken: "fresh-token",
              Expiry: later(1000),
            },
          })
        : url === "https://start"
          ? json({ data: { startChatResult } })
          : json({}),
    );
    await prefetched.cancel();

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain(
      "https://participant.example/participant/connection",
    );
    const disconnect = fetchMock.mock.calls.find(([url]) =>
      url.endsWith("/disconnect"),
    );
    expect((disconnect?.[1] as RequestInit).headers).toMatchObject({
      "X-Amz-Bearer": "fresh-token",
    });
  });

  it("leaves a chat Touchpoint has taken alone", async () => {
    const prefetched = prefetchChatDetails(config);
    await prefetched.details();
    await prefetched.cancel();

    expect(
      fetchMock.mock.calls.some(([url]) => url.includes("/participant/")),
    ).toBe(false);
  });

  it("needs an endpoint or a details function", () => {
    expect(() =>
      prefetchChatDetails({ details: { contactId: "c", participantId: "p" } }),
    ).toThrow(/chatEndpoint/);
  });
});
