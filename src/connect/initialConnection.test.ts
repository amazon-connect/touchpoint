import { describe, expect, it, vi } from "vitest";

vi.mock("amazon-connect-chatjs", () => {
  class ChatClient {
    sendAttachment() {
      throw new Error("UnImplementedMethodException");
    }
    describeView() {
      throw new Error("UnImplementedMethodException");
    }
  }
  Object.assign(window, { connect: { ChatSession: { ChatClient } } });
  return {};
});

import {
  InitialConnectionChatClient,
  readInitialConnection,
  type InitialConnection,
} from "./initialConnection";

const later = (ms: number) => new Date(Date.now() + ms).toISOString();

const initial = (
  overrides: Partial<InitialConnection> = {},
): InitialConnection => ({
  websocketUrl: "wss://socket.example/connect",
  websocketExpiry: later(60_000),
  connectionToken: "initial-connection-token",
  connectionTokenExpiry: later(3_600_000),
  ...overrides,
});

const BOTH = ["WEBSOCKET", "CONNECTION_CREDENTIALS"];

const innerClient = () => ({
  createParticipantConnection: vi.fn(async () => ({
    data: {
      ConnectionCredentials: {
        ConnectionToken: "fresh",
        Expiry: later(60_000),
      },
    },
  })),
  disconnectParticipant: vi.fn(async () => ({ data: {} })),
  sendMessage: vi.fn(async () => ({ data: { Id: "m" } })),
  sendEvent: vi.fn(async () => ({ data: { Id: "e" } })),
  getTranscript: vi.fn(async () => ({ data: { Transcript: [] } })),
  sendAttachment: vi.fn(async () => ({ data: {} })),
  downloadAttachment: vi.fn(async () => new Blob()),
  getAttachmentURL: vi.fn(async () => "https://s3.example"),
  describeView: vi.fn(async () => ({ data: {} })),
  getAuthenticationUrl: vi.fn(async () => ({ data: {} })),
  cancelParticipantAuthentication: vi.fn(async () => ({ data: {} })),
});

const wrap = (inner: object, connection = initial(), onReuse?: () => void) =>
  new InitialConnectionChatClient(
    inner as unknown as InstanceType<typeof connect.ChatSession.ChatClient>,
    connection,
    onReuse,
  );

describe("readInitialConnection", () => {
  it("reads a complete StartChatContact connection", () => {
    expect(
      readInitialConnection({
        ContactId: "c",
        Websocket: {
          Url: "wss://socket.example/x",
          ConnectionExpiry: "2030-01-01T00:00:00Z",
        },
        ConnectionCredentials: {
          ConnectionToken: "t",
          Expiry: "2030-01-02T00:00:00Z",
        },
      }),
    ).toEqual({
      websocketUrl: "wss://socket.example/x",
      websocketExpiry: "2030-01-01T00:00:00Z",
      connectionToken: "t",
      connectionTokenExpiry: "2030-01-02T00:00:00Z",
    });
  });

  it.each([
    ["no connection", { ContactId: "c" }],
    [
      "no credentials",
      { Websocket: { Url: "wss://s", ConnectionExpiry: "x" } },
    ],
    [
      "an empty token",
      {
        Websocket: { Url: "wss://s", ConnectionExpiry: "x" },
        ConnectionCredentials: { ConnectionToken: "", Expiry: "x" },
      },
    ],
    [
      "a non-websocket URL",
      {
        Websocket: { Url: "https://s", ConnectionExpiry: "x" },
        ConnectionCredentials: { ConnectionToken: "t", Expiry: "x" },
      },
    ],
  ])("ignores a result with %s", (_label, result) => {
    expect(readInitialConnection(result)).toBeUndefined();
    expect(readInitialConnection(undefined)).toBeUndefined();
  });
});

describe("InitialConnectionChatClient", () => {
  it("answers ChatJS's first connection request once, then delegates", async () => {
    const inner = innerClient();
    const onReuse = vi.fn();
    const client = wrap(inner, initial(), onReuse);

    const first = await client.createParticipantConnection(
      "participant",
      BOTH,
      null,
    );
    expect(first.data).toEqual({
      Websocket: {
        Url: "wss://socket.example/connect",
        ConnectionExpiry: expect.any(String),
      },
      ConnectionCredentials: {
        ConnectionToken: "initial-connection-token",
        Expiry: expect.any(String),
      },
    });
    expect(inner.createParticipantConnection).not.toHaveBeenCalled();
    expect(onReuse).toHaveBeenCalledOnce();

    await client.createParticipantConnection("participant", BOTH, null);
    expect(inner.createParticipantConnection).toHaveBeenCalledWith(
      "participant",
      BOTH,
      null,
    );
  });

  it.each([
    [
      "the websocket is about to expire",
      { websocketExpiry: later(1000) },
      BOTH,
      null,
    ],
    [
      "the token is about to expire",
      { connectionTokenExpiry: later(1000) },
      BOTH,
      null,
    ],
    ["ChatJS asks only for credentials", {}, ["CONNECTION_CREDENTIALS"], null],
    ["ChatJS acknowledges the connection", {}, BOTH, true],
    ["ChatJS asks for no connection types", {}, null, true],
  ])(
    "requests a fresh connection when %s",
    async (_label, overrides, type, ack) => {
      const inner = innerClient();
      const client = wrap(inner, initial(overrides));

      await client.createParticipantConnection("participant", type, ack);
      expect(inner.createParticipantConnection).toHaveBeenCalledWith(
        "participant",
        type,
        ack,
      );
      // The initial connection is discarded rather than reused later.
      await client.createParticipantConnection("participant", BOTH, null);
      expect(inner.createParticipantConnection).toHaveBeenCalledTimes(2);
    },
  );

  it("keeps the connection when the reuse observer throws", async () => {
    const client = wrap(innerClient(), initial(), () => {
      throw new Error("observer");
    });
    await expect(
      client.createParticipantConnection("p", BOTH, null),
    ).resolves.toBeDefined();
  });

  it("passes every other operation to the wrapped client unchanged", async () => {
    const inner = innerClient();
    const client = wrap(inner);
    const file = new Blob(["x"]);

    await client.sendMessage("t", "hi", "text/plain", "ct");
    await client.sendEvent("t", "application/json", "{}", "ce");
    await client.getTranscript("t", {
      maxResults: 1,
    });
    await client.disconnectParticipant("t");
    await client.sendAttachment("t", file, { m: 1 });
    await client.downloadAttachment("t", "a");
    await client.getAttachmentURL("t", "a");
    await client.describeView("v", "t");
    await client.getAuthenticationUrl("t", "https://r", "s");
    await client.cancelParticipantAuthentication("t", "s");

    expect(inner.sendMessage).toHaveBeenCalledWith(
      "t",
      "hi",
      "text/plain",
      "ct",
    );
    expect(inner.sendEvent).toHaveBeenCalledWith(
      "t",
      "application/json",
      "{}",
      "ce",
    );
    expect(inner.getTranscript).toHaveBeenCalledWith("t", { maxResults: 1 });
    expect(inner.disconnectParticipant).toHaveBeenCalledWith("t");
    expect(inner.sendAttachment).toHaveBeenCalledWith("t", file, { m: 1 });
    expect(inner.downloadAttachment).toHaveBeenCalledWith("t", "a");
    expect(inner.getAttachmentURL).toHaveBeenCalledWith("t", "a");
    expect(inner.describeView).toHaveBeenCalledWith("v", "t");
    expect(inner.getAuthenticationUrl).toHaveBeenCalledWith(
      "t",
      "https://r",
      "s",
    );
    expect(inner.cancelParticipantAuthentication).toHaveBeenCalledWith(
      "t",
      "s",
    );
  });

  it("keeps ChatJS's view of operations a custom client leaves unimplemented", () => {
    const base = connect.ChatSession.ChatClient.prototype as unknown as Record<
      string,
      unknown
    >;
    const {
      sendAttachment: _omitted,
      describeView: _alsoOmitted,
      ...partial
    } = innerClient();
    const client = wrap(partial) as unknown as Record<string, unknown>;

    expect(client.sendAttachment).toBe(base.sendAttachment);
    expect(client.describeView).toBe(base.describeView);
    expect(client.getAuthenticationUrl).not.toBe(base.getAuthenticationUrl);
  });
});
