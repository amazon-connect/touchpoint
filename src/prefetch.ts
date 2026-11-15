// A small entry (`@amazon-connect-touchpoint/web/prefetch`) that starts the chat
// contact without loading ChatJS or the UI, so a host can call it from its own
// launch button and load the rest of Touchpoint meanwhile.
import type { ConnectConfig } from "./connect";
import {
  chatDetailsSource,
  participantEndpointForRegion,
  type ChatDetails,
} from "./connect/startChat";

/**
 * A chat started before Touchpoint needs it. See {@link prefetchChatDetails}.
 * @category Basics
 */
export interface PrefetchedChat {
  /**
   * Pass as `config.details`. The first call returns the original request,
   * including its failure; it never retries a potentially created contact.
   * Later calls, such as for a new conversation after the first ends, start a
   * fresh chat. Canceling an unclaimed prefetch prevents it from being used.
   */
  details: () => Promise<ChatDetails>;
  /**
   * Ends the prefetched chat if Touchpoint has not taken it, for example when
   * the customer leaves before the chat UI loads. Best effort; never rejects.
   */
  cancel: () => Promise<void>;
}

/**
 * Starts the chat contact now — for example when the customer clicks your own
 * launch button — so that StartChatContact overlaps loading and mounting
 * Touchpoint instead of following it. Pass the result's `details` as
 * `config.details`, with the same `config` otherwise.
 *
 * Import it from `@amazon-connect-touchpoint/web/prefetch` to start the chat
 * before the rest of Touchpoint has loaded. Pair with
 * `requestInitialConnection: true` to also receive the websocket, so the chat
 * can connect as soon as Touchpoint mounts. The prefetched details are held in
 * memory only and handed out once.
 * @category Basics
 * @param config - the Connect configuration Touchpoint will use; needs `chatEndpoint` or a `details` function
 * @returns the prefetched chat
 */
export const prefetchChatDetails = (config: ConnectConfig): PrefetchedChat => {
  const source = chatDetailsSource(config);
  if (typeof source !== "function") {
    throw new Error(
      "prefetchChatDetails needs `chatEndpoint` or a `details` function.",
    );
  }
  let pending: Promise<ChatDetails> | undefined = source();
  let canceled = false;
  // A failure is handled by `details`, not reported as an unhandled rejection.
  pending.catch(() => {});
  const release = (): Promise<ChatDetails> | undefined => {
    const current = pending;
    pending = undefined;
    return current;
  };
  return {
    details: () => {
      if (canceled) {
        return Promise.reject(new Error("The prefetched chat was canceled."));
      }
      const prefetched = release();
      return prefetched ?? source();
    },
    cancel: async () => {
      const prefetched = release();
      if (prefetched == null) return;
      canceled = true;
      try {
        const details = await prefetched;
        // Loaded only to end an untaken chat, keeping this entry small.
        const client =
          config.customChatClient ??
          new (
            await import("./connect/participantClient")
          ).ParticipantServiceClient(
            typeof config.globalConfig?.endpoint === "string"
              ? config.globalConfig.endpoint
              : participantEndpointForRegion(
                  config.region ?? "us-west-2",
                  config.stage,
                ),
          );
        let token = details.initialConnection?.connectionToken;
        if (token == null) {
          const connection = await client.createParticipantConnection(
            details.participantToken ?? null,
            ["CONNECTION_CREDENTIALS"],
            null,
          );
          token = connection.data.ConnectionCredentials?.ConnectionToken;
        }
        await client.disconnectParticipant(token ?? null);
      } catch {
        // The contact also ends on its own once its chat duration elapses.
      }
    },
  };
};
