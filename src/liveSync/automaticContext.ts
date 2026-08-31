/* eslint-disable jsdoc/require-jsdoc */
import { computeAccessibleName } from "dom-accessibility-api";

import type { ConnectConversationHandler } from "../connect";
import { analyzePageForms } from "./analyzePageForms";
import { equals, uniq } from "ramda";
import { debug } from "./debug";

import type {
  LiveSyncContext,
  LiveSyncCustomAction,
  PageState,
} from "../interface";

const debounceAsync = <T extends any[]>(
  func: (...args: T) => Promise<void>,
  wait: number = 50,
  maxWait: number = Infinity,
) => {
  let timeout: NodeJS.Timeout | null = null;
  let firstRequestTime: number | null = null;
  let lastPromise: Promise<void> = Promise.resolve();

  return (...args: T) => {
    firstRequestTime ??= Date.now();
    const call = (): void => {
      lastPromise = lastPromise.then(async () => {
        try {
          await func.apply(null, args);
        } catch (_error) {}
      });
      firstRequestTime = null; // Reset the first request time
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    if (Date.now() - firstRequestTime > maxWait) {
      call();
    } else {
      timeout = setTimeout(() => {
        call();
      }, wait);
    }
  };
};

export const gatherAutomaticContext = (
  handler: ConnectConversationHandler,
  customActions: LiveSyncCustomAction[],
  override: (arg: { context: LiveSyncContext; state: PageState }) => {
    context: LiveSyncContext;
    state: PageState;
  },
  setPageState: (state: PageState) => void,
): {
  teardown: () => void;
  onCustomActionsChange: (actions: LiveSyncCustomAction[]) => void;
} => {
  let previousContext: LiveSyncContext = {
    // uri: "",
    fields: [],
    destinations: [],
    actions: [],
  };

  const go = debounceAsync(
    async () => {
      const { context, state } = override(gatherContext(customActions));
      if (!equals(previousContext, context)) {
        try {
          debug("Automatic context sent:", context);
          await handler.sendContext({ "nlx:vpContext": context });
        } catch (_error) {}
        setPageState(state);
        previousContext = context;
      }
    },
    50,
    300,
  );

  go();

  const observer = new MutationObserver(go);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  });

  // Return a cleanup function to disconnect the observer
  return {
    teardown: () => {
      observer.disconnect();
    },
    onCustomActionsChange: (actions) => {
      customActions = actions;
      go();
    },
  };
};

const gatherContext = (
  customActions: LiveSyncCustomAction[],
): { context: LiveSyncContext; state: PageState } => {
  const { context: fields, formElements } = analyzePageForms();
  const { context: destinations, links } = analyzePageLinks();

  const context = {
    uri: window.location.pathname,
    fields,
    destinations,
    actions: customActions
      .filter((action) => action.description != null)
      .map((action) => {
        const { handler: _, ...actionWithoutHandler } = action;
        return actionWithoutHandler;
      }),
  };

  return {
    context,
    state: {
      formElements,
      links,
      customActions: new Map(
        customActions.map((c) => {
          return [c.action, c.handler];
        }),
      ),
    },
  };
};

const analyzePageLinks = (): {
  context: string[];
  links: Record<string, string>;
} => {
  const links = Object.fromEntries(
    uniq(
      Array.from(document.querySelectorAll("a")).map((link) => [
        computeAccessibleName(link),
        link.getAttribute("href") ?? "",
      ]),
    ),
  );

  return { context: Object.keys(links), links };
};
