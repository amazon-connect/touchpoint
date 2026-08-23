/* eslint-disable jsdoc/require-jsdoc */
import type { ConnectConversationHandler } from "../connect";
import type { PageState, LiveSyncConfig, InputField } from "../interface";
import { debug } from "./debug";

type LiveSyncEvent =
  | {
      classification: "navigation";
      payload: {
        action: "page_next" | "page_previous" | "page_custom" | "page_unknown";
        destination: string | undefined;
      };
    }
  | {
      classification: "input";
      payload: {
        fields: InputField[];
      };
    }
  | {
      classification: "custom";
      action: string;
      payload: unknown;
    };

export const actionHandler = (
  handler: ConnectConversationHandler,
  liveSync: LiveSyncConfig,
  pageState: {
    current: PageState;
  },
) => {
  const impl = (event: LiveSyncEvent): void => {
    debug("Action received", event);
    switch (event.classification) {
      case "navigation": {
        // Tolerate both envelope shapes: the page action + destination may live inside
        // `payload` (`{payload:{action,destination}}`) or at the top level alongside
        // `classification` (`{action,destination,...}` / `{action,payload:{destination}}`),
        // mirroring how custom actions carry `action` at the top level.
        const nav = event as {
          action?: string;
          destination?: string;
          payload?: { action?: string; destination?: string };
        };
        const navAction = (nav.payload?.action ?? nav.action) as
          | "page_next"
          | "page_previous"
          | "page_custom"
          | "page_unknown"
          | undefined;
        const navDestination = nav.payload?.destination ?? nav.destination;
        if (liveSync.navigation != null) {
          if (navAction != null) {
            liveSync.navigation(
              navAction,
              navDestination,
              pageState.current.links,
            );
          }
        } else if (liveSync.automaticContext !== false) {
          switch (navAction) {
            case "page_next":
              window.history.forward();
              break;
            case "page_previous":
              window.history.back();

              break;
            case "page_custom":
              if (navDestination != null) {
                const url = pageState.current.links[navDestination];
                if (url != null) {
                  window.location.href = url;
                } else {
                  try {
                    new URL(navDestination);
                    window.location.href = navDestination;
                  } catch (_error) {
                    debug(
                      `Custom page navigation action received, but no URL found for destination".`,
                      navDestination,
                    );
                  }
                }
              }
              break;
            case "page_unknown":
              debug(
                "Unknown page navigation action received, no automatic handling available.",
              );
          }
        }
        break;
      }
      case "input":
        if (liveSync?.input != null) {
          liveSync.input(event.payload.fields, pageState.current.formElements);
        } else if (liveSync?.automaticContext !== false) {
          event.payload.fields.forEach((field) => {
            if (pageState.current.formElements[field.id] != null) {
              const element = pageState.current.formElements[field.id] as
                HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
              if (typeof field.value === "string") {
                element.value = field.value;
              } else if (
                element instanceof HTMLInputElement &&
                element.type === "checkbox"
              ) {
                element.checked = field.value;
              }
              element.classList.add("voice-updated");

              // Trigger events for frameworks that listen to them
              element.dispatchEvent(new Event("input", { bubbles: true }));
              element.dispatchEvent(new Event("change", { bubbles: true }));

              setTimeout(() => {
                element.classList.remove("voice-updated");
              }, 2000);
            }
          });
        }
        break;
      case "custom": {
        const customHandler = pageState.current.customActions.get(event.action);
        if (customHandler != null) {
          customHandler(event.payload);
        }
        debug(
          `No custom action handler was defined for the %o action.\n\n%cTip: Set up a handler with \nsetCustomLiveSyncActions([{ action: "${event.action}", handler() { }}])`,
          event.action,
          "font-style: italic; font-size: 90%",
        );
        if (liveSync?.custom != null) {
          if (liveSync.automaticContext !== false) {
            // eslint-disable-next-line no-console
            console.warn(
              "liveSync.custom is deprecated in automatic context mode. Please use `setCustomLiveSyncActions` instead.",
            );
          }
          liveSync.custom(event.action, event.payload);
        }
        break;
      }
    }
  };
  handler.addEventListener("voicePlusCommand", impl);

  return () => {
    handler.removeEventListener("voicePlusCommand", impl);
  };
};
