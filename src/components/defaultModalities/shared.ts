/* eslint-disable jsdoc/require-jsdoc */
import { type ConnectConversationHandler } from "../../connect";

export interface SaveAs {
  type: "slot" | "context" | "choiceId";
  id: string;
}

export interface CardRow {
  label: string;
  value: string;
}

export interface CardData {
  id?: string;
  thumbnail?: string;
  thumbnailAlt?: string;
  rows?: CardRow[];
  label?: string;
  value?: string;
}

export const saveFn = (
  $saveAs: SaveAs,
  conversationHandler: ConnectConversationHandler,
): ((val: any) => void) => {
  return (val) => {
    if ($saveAs == null) {
      return;
    }
    if ($saveAs.type === "slot") {
      conversationHandler.sendSlots({ [$saveAs.id]: val });
    }
    if ($saveAs.type === "context") {
      void conversationHandler.sendContext({ [$saveAs.id]: val });
    }
    if ($saveAs.type === "choiceId") {
      conversationHandler.sendChoice(
        typeof val === "string" ? val : JSON.stringify(val),
      );
    }
  };
};
