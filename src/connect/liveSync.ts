/**
 * Live Sync action socket. Amazon Connect pushes page-driving actions (navigation,
 * form filling, custom actions) to the browser over a receive-only WebSocket; this opens
 * that socket and forwards each parsed message to the handler's `voicePlusCommand`
 * listeners, which the Live Sync action handler consumes.
 */

/** Connection details for the Live Sync action socket. */
export interface LiveSyncSocketConfig {
  /** Host of the Live Sync action socket (e.g. `ws.nlu.acxd.connect.<region>.amazonaws.com`). */
  host: string;
  /** Deployment key for the Live Sync socket. */
  deploymentKey: string;
  /** API key for the Live Sync socket. */
  apiKey: string;
  /** Amazon Connect contact ID; sent as `conversationId` on the wire. */
  contactId: string;
  /** Language code; the channel key is `connect-<languageCode>`. */
  languageCode: string;
}

/**
 * Opens the Live Sync action socket and forwards each JSON message to `onAction`.
 * @param config - socket connection details
 * @param onAction - called with each parsed action pushed by Amazon Connect
 * @returns a teardown function that closes the socket
 */
export const openLiveSyncSocket = (
  config: LiveSyncSocketConfig,
  onAction: (action: unknown) => void,
): (() => void) => {
  const url = new URL(`wss://${config.host}/`);
  url.searchParams.set("deploymentKey", config.deploymentKey);
  url.searchParams.set("channelKey", `connect-${config.languageCode}`);
  url.searchParams.set("apiKey", config.apiKey);
  url.searchParams.set("conversationId", config.contactId);
  url.searchParams.set("type", "voice-plus");

  const socket = new WebSocket(url.href);
  socket.onmessage = (event) => {
    if (typeof event.data !== "string") {
      return;
    }
    try {
      const action: unknown = JSON.parse(event.data);
      if (action != null) {
        onAction(action);
      }
    } catch {
      // Ignore malformed frames.
    }
  };

  return () => {
    socket.onmessage = null;
    socket.close();
  };
};
