/* eslint-disable jsdoc/require-jsdoc */
import type { TouchpointConfiguration } from "./interface";

export type NormalizedTouchpointConfiguration = TouchpointConfiguration &
  Required<
    Pick<
      TouchpointConfiguration,
      "initializeConversation" | "input" | "languageCode"
    >
  >;
