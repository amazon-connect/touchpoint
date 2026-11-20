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

vi.mock("amazon-connect-chatjs", () => {
  class ChatClient {
    readonly base = true;
  }
  Object.assign(window, { connect: { ChatSession: { ChatClient } } });
  return {};
});

import { ParticipantServiceClient } from "./participantClient";

const ENDPOINT = "https://participant.connect-gamma.us-west-2.api.aws";

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const calls = (fetchMock: FetchMock) =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url,
    method: init?.method,
    headers: init?.headers as Record<string, string>,
    body:
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined,
  }));

describe("ParticipantServiceClient", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => json(200, { Id: "server-id" }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("calls the participant REST operations ChatJS uses", async () => {
    const client = new ParticipantServiceClient(`${ENDPOINT}/`);
    await client.createParticipantConnection(
      "participant-token",
      ["WEBSOCKET", "CONNECTION_CREDENTIALS"],
      null,
    );
    await client.sendMessage(
      "connection-token",
      "hi",
      "text/plain",
      "client-1",
    );
    await client.getTranscript("connection-token", {
      contactId: "contact",
      maxResults: 15,
      scanDirection: "BACKWARD",
      sortOrder: "ASCENDING",
      startPosition: { mostRecent: 0 },
    });
    await client.describeView("view/token", "connection-token");
    await client.getAuthenticationUrl(
      "connection-token",
      "https://site",
      "s-1",
    );
    await client.cancelParticipantAuthentication("connection-token", "s-1");
    await client.disconnectParticipant("connection-token");

    const sent = calls(fetchMock);
    expect(sent.map(({ method, url }) => `${method} ${url}`)).toEqual([
      `POST ${ENDPOINT}/participant/connection`,
      `POST ${ENDPOINT}/participant/message`,
      `POST ${ENDPOINT}/participant/transcript`,
      `GET ${ENDPOINT}/participant/views/view%2Ftoken`,
      `POST ${ENDPOINT}/participant/authentication-url`,
      `POST ${ENDPOINT}/participant/cancel-authentication`,
      `POST ${ENDPOINT}/participant/disconnect`,
    ]);
    expect(sent[0].headers["X-Amz-Bearer"]).toBe("participant-token");
    expect(sent[0].body).toEqual({
      Type: ["WEBSOCKET", "CONNECTION_CREDENTIALS"],
    });
    expect(sent[1].headers["X-Amz-Bearer"]).toBe("connection-token");
    expect(sent[1].body).toEqual({
      Content: "hi",
      ContentType: "text/plain",
      ClientToken: "client-1",
    });
    expect(sent[2].body).toEqual({
      ContactId: "contact",
      MaxResults: 15,
      ScanDirection: "BACKWARD",
      SortOrder: "ASCENDING",
      StartPosition: { MostRecent: 0 },
    });
    expect(sent[3].body).toBeUndefined();
    expect(sent[4].body).toEqual({
      RedirectUri: "https://site",
      SessionId: "s-1",
    });
    expect(sent[6].body?.ClientToken).toEqual(expect.any(String));
    for (const init of fetchMock.mock.calls.map(
      ([, init]) => init as RequestInit,
    )) {
      expect(init.credentials).toBe("omit");
    }
  });

  it("uploads and downloads attachments through pre-signed URLs", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/start-attachment-upload")) {
        return json(200, {
          AttachmentId: "a-1",
          UploadMetadata: {
            Url: "https://s3.example/put",
            HeadersToInclude: { "x-amz-acl": "x" },
          },
        });
      }
      if (url.endsWith("/attachment"))
        return json(200, { Url: "https://s3.example/get" });
      if (url === "https://s3.example/get") return new Response("bytes");
      return json(200, {});
    });
    const client = new ParticipantServiceClient(ENDPOINT);
    const file = new File(["data"], "note.txt", { type: "text/plain" });
    await client.sendAttachment("connection-token", file);
    const blob = await client.downloadAttachment("connection-token", "a-1");

    const sent = calls(fetchMock);
    expect(sent.map(({ method, url }) => `${method} ${url}`)).toEqual([
      `POST ${ENDPOINT}/participant/start-attachment-upload`,
      "PUT https://s3.example/put",
      `POST ${ENDPOINT}/participant/complete-attachment-upload`,
      `POST ${ENDPOINT}/participant/attachment`,
      // The download is a plain GET with no request options.
      "undefined https://s3.example/get",
    ]);
    expect(sent[0].body).toMatchObject({
      ContentType: "text/plain",
      AttachmentName: "note.txt",
      AttachmentSizeInBytes: 4,
      ClientToken: expect.any(String),
    });
    expect(sent[1].headers).toEqual({ "x-amz-acl": "x" });
    expect(sent[2].body).toMatchObject({ AttachmentIds: ["a-1"] });
    expect(blob.size).toBe(5);
  });

  it("retries throttling, server and network errors with one idempotency token", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(json(429, { message: "slow down" }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json(200, { Id: "server-id" }));
    const client = new ParticipantServiceClient(ENDPOINT);
    const result = client.sendMessage("connection-token", "hi", "text/plain");
    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual({ data: { Id: "server-id" } });
    const tokens = calls(fetchMock).map(({ body }) => body?.ClientToken);
    expect(tokens).toHaveLength(3);
    expect(new Set(tokens).size).toBe(1);
  });

  it("stops after the last attempt with ChatJS's error shape", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () =>
      json(503, { message: "token abc unavailable" }),
    );
    const client = new ParticipantServiceClient(ENDPOINT);
    const result = client.getTranscript("connection-token", {});
    const settled = result.catch((error: unknown) => error);
    await vi.runAllTimersAsync();

    const error = (await settled) as Error & {
      type: string;
      statusCode: number;
    };
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(error.type).toBe("InternalServerException");
    expect(error.statusCode).toBe(503);
    expect(error.message).not.toContain("abc");
  });

  it("does not retry client errors and names access denial for ChatJS", async () => {
    fetchMock.mockResolvedValue(
      json(
        403,
        { message: "no" },
        { "x-amzn-ErrorType": "AccessDeniedException:http://internal" },
      ),
    );
    const client = new ParticipantServiceClient(ENDPOINT);

    await expect(
      client.createParticipantConnection(
        "participant-token",
        ["WEBSOCKET"],
        null,
      ),
    ).rejects.toMatchObject({ type: "AccessDeniedException", statusCode: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("names a 403 without an error-type header as access denial", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 403 }));
    const client = new ParticipantServiceClient(ENDPOINT);

    await expect(client.disconnectParticipant("t")).rejects.toMatchObject({
      type: "AccessDeniedException",
      name: "AccessDeniedException",
    });
  });

  it("times out a request that never answers and retries it", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const client = new ParticipantServiceClient(ENDPOINT, {
      timeoutMs: 1000,
      maxAttempts: 2,
    });
    const settled = client
      .sendEvent("t", "application/json", "{}")
      .catch((error: unknown) => error);
    await vi.runAllTimersAsync();

    expect(await settled).toMatchObject({ type: "TimeoutError" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends at most one typing event per ten seconds, like ChatJS", async () => {
    vi.useFakeTimers();
    const client = new ParticipantServiceClient(ENDPOINT);
    const typing = "application/vnd.amazonaws.connect.event.typing";
    const first = client.sendEvent("t", typing, "");
    const second = client.sendEvent("t", typing, "");
    await client.sendEvent(
      "t",
      "application/vnd.amazonaws.connect.event.message.read",
      "{}",
    );
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(10001);
    await client.sendEvent("t", typing, "");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects an unreadable success response", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    const client = new ParticipantServiceClient(ENDPOINT);

    await expect(
      client.sendMessage("t", "hi", "text/plain"),
    ).rejects.toMatchObject({
      type: "SerializationException",
    });
  });
});
