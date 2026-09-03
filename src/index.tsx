import { createElement, type FC } from "react";
import { type Root, createRoot } from "react-dom/client";
import htm from "htm";
import { equals } from "ramda";
import packageJson from "../package.json";
import App, { type AppRef } from "./App";
import cssRaw from "./index.css?inline";
import * as Icons from "./components/ui/Icons";
import { TextButton } from "./components/ui/TextButton";
import { IconButton } from "./components/ui/IconButton";
import { Ripple } from "./components/Ripple";
import { BaseText, SmallText } from "./components/ui/Typography";
import {
  CustomCard,
  CustomCardRow,
  CustomCardImageRow,
} from "./components/ui/CustomCard";
import { Carousel } from "./components/ui/Carousel";
import { DateInput } from "./components/ui/DateInput";
import { defaultModalities } from "./components/defaultModalities";
import type {
  TouchpointConfiguration,
  CustomModalityComponent,
  TouchpointInstance,
} from "./interface";
import type { NormalizedTouchpointConfiguration } from "./types";

/**
 * If you wish to build custom modalities using JSX, you will want to
 *
 * ```javascript
 * import { React } from "@amazon-connect-touchpoint/web";
 * ```
 *
 * instead of importing from "react" directly. This ensures that the custom modalities will
 * be running in the same React context as the Touchpoint UI using the correct version of React.
 * @category Modality components
 */
export { default as React } from "react";

/**
 * Package version
 * @category Utilities
 */
export const version: string = packageJson.version;

// Create a htm instance where components can be used
const createHtml = (
  components: Record<string, FC<any>>,
): ReturnType<typeof htm.bind> =>
  htm.bind((type, ...rest) => createElement(components[type] ?? type, ...rest));

/**
 * A tagged literal for creating reactive elements for custom modalities.
 * It already knows about all Touchpoint UI components, so you can use them directly without the need to import them.
 * Also very useful when using Touchpoint directly from CDN or in projects without a build step.
 * @example
 * ```ts
 * import { html, Icons } from '@amazon-connect-touchpoint/web';
 *
 * const MyCustomModality = ({data, conversationHandler}) =>
 *   html`<div style="display: flex; gap: 8px;">
 *    <IconButton label="Cancel" Icon=${Icons.Close} type="ghost" onClick=${cancel()} />
 *    <TextButton
 *     label="Submit"
 *     Icon=${Icons.ArrowForward}
 *     type="main"
 *     onClick=${() => conversationHandler.sendText('Button clicked!')}
 *   />
 *  </div>`;
 * ```
 * @category Modality components
 */
export const html = createHtml({
  TextButton,
  IconButton,
  BaseText,
  SmallText,
  DateInput,
  Carousel,
  CustomCard,
  CustomCardRow,
  CustomCardImageRow,
  Ripple,
  ...Icons,
});

// Export types for all components
export {
  type CustomCardProps,
  type CustomCardRowProps,
} from "./components/ui/CustomCard";
export { type DateInputProps } from "./components/ui/DateInput";
export {
  type IconButtonProps,
  type IconButtonType,
} from "./components/ui/IconButton";
export { type TextButtonProps } from "./components/ui/TextButton";
export type {
  WindowSize,
  ColorMode,
  ChoiceMessage,
  CustomModalityComponent,
  Theme,
  InitializeConversation,
  CustomLaunchButton,
  Input,
  InputField,
  PageState,
  LiveSyncContext,
  LiveSyncConfig,
  LiveSyncConnection,
  TouchpointConfiguration,
  LiveSyncCustomAction,
  SendStepParams,
  TouchpointInstance,
  ConnectConfig,
  ChatDetails,
  DetailsRequestParams,
} from "./interface";

export {
  analyzePageForms,
  type InteractiveElementInfo,
  type PageForms,
  type AccessibilityInformation,
} from "./liveSync/analyzePageForms";

const normalizeConfiguration = (
  configuration: TouchpointConfiguration,
): NormalizedTouchpointConfiguration => {
  const modalityComponents: Record<string, CustomModalityComponent<unknown>> = {
    ...(configuration.modalityComponents ?? {}),
    ...defaultModalities,
  };

  return {
    ...configuration,
    languageCode:
      configuration.languageCode ??
      (typeof navigator !== "undefined" ? navigator.language : undefined) ??
      "en-US",
    input: configuration.input ?? "text",
    modalityComponents,
    // Amazon Connect drives the greeting from the contact flow when the
    // participant connects, so there is nothing to send client-side. (NLX's
    // `sendWelcomeFlow`/`sendWelcomeIntent` are not supported by the Connect
    // Chat Interface integration.)
    initializeConversation: configuration.initializeConversation ?? (() => {}),
  };
};

/**
 * Injects some sane default styling for embedded toucbhpoints.
 * This is only done once, so if you create multiple touchpoints, they will all share the same styles.
 * Done using a style tag so that there is low specificity and it can be overridden by the user.
 */
let injectDefaultStyles: () => void = () => {
  const style = document.createElement("style");
  style.textContent = `:where(connect-touchpoint.connect-text, connect-touchpoint.connect-voice) {
    display: block;
    height: 350px;
  }
  :where(connect-touchpoint.connect-voiceMini) {
   display: inline-block;

  }`;
  document.head.appendChild(style);
  injectDefaultStyles = () => {};
};

/**
 * A custom element implementing touchpoint.
 *
 * Note that when you create this element using the `create` function, it will have different defaults.
 */
class NlxTouchpointElement extends HTMLElement {
  #root: Root | null = null;
  #shadowRoot: ShadowRoot | null = null;
  #touchpointConfiguration: TouchpointConfiguration | null = null;

  /**
   * Returns an imperative reference allowing control over the application
   * @internal
   */
  onRef: ((ref: AppRef) => void) | null = null;

  /**
   * When set to false, will render a button that opens the touchpoint in a separate DOM location.
   *
   * When set to true, you get the touchpoint directly, and can control its size and placement.
   * @internal
   */
  embedded: boolean = true;

  /**
   * What does the close button in touchpoint do:
   * - If set to null, the close button will not be rendered
   * - If set to a function, the function will be called when the close button is clicked
   *  You may call `preventDefault` to prevent the touchpoint from closing and handle closing yourself.
   */
  onClose: ((event: Event) => void) | null = null;
  /**
   * Render the settings button
   * @internal
   */
  enableSettings: boolean = false;

  // TODO: revisit enabled vs. enableSettings naming
  #enabled: boolean = true;

  /**
   * Disable the whole UI
   * @internal
   */
  set enabled(value: boolean) {
    if (this.#enabled === value) {
      return;
    }
    this.#enabled = value;
    this.#render();
  }

  /** The touchpoint configuration */
  set touchpointConfiguration(value: TouchpointConfiguration) {
    if (equals(this.#touchpointConfiguration, value)) {
      return;
    }
    this.#touchpointConfiguration = value;
    this.#render();
  }

  #render(): void {
    this.#shadowRoot ??= this.attachShadow({ mode: "closed" });
    this.#root ??= createRoot(this.#shadowRoot);
    if (this.#touchpointConfiguration != null) {
      const configuration = normalizeConfiguration(
        this.#touchpointConfiguration,
      );

      this.#root.render(
        <>
          <style>{cssRaw}</style>
          <App
            {...configuration}
            embedded={this.embedded}
            onClose={this.onClose}
            enableSettings={this.enableSettings}
            enabled={this.#enabled}
            ref={(ref) => {
              if (ref != null) {
                this.onRef?.(ref);
              }
            }}
          />
        </>,
      );
    }
  }

  connectedCallback(): void {
    if (
      this.#touchpointConfiguration == null &&
      this.getAttribute("configuration") != null
    ) {
      try {
        this.touchpointConfiguration = JSON.parse(
          this.getAttribute("configuration") ?? "",
        );
      } catch (error) {
        throw new Error(
          "Failed to parse touchpoint configuration: " +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }
    if (this.embedded) {
      injectDefaultStyles();
      this.classList.add(
        `connect-${this.#touchpointConfiguration?.input ?? "text"}`,
      );
    }
  }

  disconnectedCallback(): void {
    const root = this.#root;
    this.#root = null;
    // Defer unmounting: when the host app removes this element during its own React
    // render (e.g. closing the widget flips a `started` flag), unmounting our root
    // synchronously here throws "Attempted to synchronously unmount a root while React
    // was already rendering". A microtask runs after that render/commit completes.
    queueMicrotask(() => {
      root?.unmount();
    });
  }
}

// Avoid defining multiple instances in case the script is loaded multiple times
const customElementsDefine: typeof customElements.define = (
  name,
  constructor,
): void => {
  if (customElements.get(name) == null) {
    customElements.define(name, constructor);
  }
};

customElementsDefine("connect-touchpoint", NlxTouchpointElement);

/**
 * Creates a new Touchpoint UI instance and appends it to the document body
 * @param props - Configuration props for Touchpoint
 * @returns A promise that resolves to a TouchpointInstance
 * @category Basics
 */
export const create = (
  props: TouchpointConfiguration,
): Promise<TouchpointInstance> => {
  return new Promise((resolve) => {
    const element: any = document.createElement("connect-touchpoint");
    element.embedded = false;
    element.onRef = (ref: AppRef) => {
      resolve({
        set expanded(val) {
          ref.setExpanded(val);
        },
        get expanded() {
          return ref.getExpanded();
        },
        get conversationHandler() {
          return ref.getConversationHandler();
        },
        teardown: () => {
          document.body.removeChild(element);
        },
        setCustomLiveSyncActions(actions) {
          ref.setCustomLiveSyncActions(actions);
        },
        async sendContext(context) {
          ref.sendLiveSyncContext(context);
        },
        sendStep(params) {
          return (
            (
              ref.getConversationHandler() as unknown as {
                sendStep?: (p: typeof params) => Promise<void>;
              }
            ).sendStep?.(params) ?? Promise.resolve()
          );
        },
      });
    };
    element.onClose = () => {};
    element.enableSettings = true;
    element.touchpointConfiguration = props;
    document.body.appendChild(element);
  });
};

export { Container as PreviewContainer } from "./preview";

export {
  TextButton,
  IconButton,
  BaseText,
  SmallText,
  DateInput,
  Carousel,
  CustomCard,
  CustomCardRow,
  CustomCardImageRow,
  Icons,
  Ripple,
};
