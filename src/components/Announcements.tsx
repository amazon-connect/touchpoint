/* eslint-disable jsdoc/require-jsdoc */
import { type FC } from "react";
import { marked } from "marked";
import { ResponseType, type Response } from "@nlxai/core";

import { type AuthenticationStatus } from "../connect";
import { type Copy } from "../interface";
import { useCopy } from "../utils/useCopy";
import { type GuideReference } from "./ui/GuideCard";

/**
 * The single announcer for a chat surface. The transcript itself is deliberately
 * inert: a live region only announces mutations to a region the screen reader was
 * already watching, and the transcript is re-created whenever the surface switches
 * between the welcome screen, the settings panel and the conversation.
 */

const blockEnd = /<\/(?:p|li|h[1-6]|blockquote|div|td|th|tr|pre)>/gi;

/** `&amp;` must be undone last, or `&amp;lt;` would turn back into a tag. */
const entities: Array<[RegExp, string]> = [
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&#(?:39|x27);/gi, "'"],
  [/&amp;/g, "&"],
];

/**
 * The words to speak for a Markdown message. Runs the same `marked` parse the
 * transcript uses (see {@link SafeMarkdown}) and keeps only the text, so asterisks
 * are not read out and no link or button is duplicated into the tab order.
 */
export const spokenText = (markdown: string): string => {
  const html = marked(markdown, { async: false });
  const withBoundaries = html
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(blockEnd, ". ")
    .replace(/<[^>]*>/g, "");
  const decoded = entities.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    withBoundaries,
  );
  return (
    decoded
      .replace(/\s+/g, " ")
      .replace(/\s+([.,;:!?])/g, "$1")
      // Block boundaries above leave runs like "$10.." where the text already
      // ended in punctuation.
      .replace(/([.!?…])(?:\s*[.!?…])+/g, "$1")
      .trim()
  );
};

export interface Announcement {
  /**
   * Keys the rendered child, so two identical consecutive announcements still
   * replace the node — an unmutated live region stays silent.
   */
  key: string;
  text: string;
}

const withCount = (template: string, count: number): string =>
  template.replace("{count}", String(count));

export const conversationAnnouncement = (
  {
    responses,
    interimMessage,
  }: { responses: Response[]; interimMessage?: string },
  copy: Copy,
): Announcement => {
  const index = responses.length - 1;
  const last: Response | undefined = responses[index];

  if (last == null) {
    return { key: "idle", text: "" };
  }

  // Before any progress text, which is now stale.
  if (last.type === ResponseType.Failure) {
    return { key: `failure-${index}`, text: last.payload.text };
  }

  // A notice is a discrete event — an agent joining, an authentication prompt —
  // so it outranks progress text that may still be running alongside it.
  if (last.type === ResponseType.Notice) {
    const authentication = (
      last as { authentication?: { status: AuthenticationStatus } }
    ).authentication;
    return {
      key: `notice-${index}`,
      text:
        authentication == null
          ? last.payload.text
          : (copy.authentication?.status[authentication.status] ??
            last.payload.text),
    };
  }

  // Keyed on the text so each distinct step speaks and a repeat does not.
  if (interimMessage != null) {
    return { key: `interim-${interimMessage}`, text: interimMessage };
  }

  // The input clears whether or not the send succeeded, so nothing else
  // confirms it went out.
  if (last.type === ResponseType.User) {
    return { key: `waiting-${index}`, text: copy.announcements.thinking };
  }

  const messages = last.payload.messages;
  const attachments =
    (last as { attachments?: Array<{ id: string; name: string }> })
      .attachments ?? [];
  const guide = (last as { guide?: GuideReference }).guide;

  const parts = [
    ...messages
      .map((message) => spokenText(message.text))
      .filter((text) => text !== ""),
    // The download pills carry no text of their own beyond the file name.
    ...attachments.map((attachment) => attachment.name),
  ];
  if (guide != null) {
    parts.push(copy.guide.label);
  }
  if (parts.length === 0) {
    parts.push(copy.announcements.received);
  }
  const choiceCount = messages.reduce(
    (total, message) => total + message.choices.length,
    0,
  );
  if (choiceCount > 0) {
    parts.push(
      withCount(
        choiceCount === 1
          ? copy.announcements.choice
          : copy.announcements.choices,
        choiceCount,
      ),
    );
  }
  return {
    // Counted, because one turn can stream a second message or attachment into
    // the same response and the text would otherwise grow silently.
    key: `response-${index}-${messages.length}-${attachments.length}`,
    text: parts.join(" "),
  };
};

/** Mount once per surface, outside anything that remounts. */
export const ConversationAnnouncer: FC<{
  responses: Response[];
  interimMessage?: string;
}> = ({ responses, interimMessage }) => {
  const copy = useCopy();
  const { key, text } = conversationAnnouncement(
    { responses, interimMessage },
    copy,
  );
  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {text === "" ? null : <span key={key}>{text}</span>}
    </div>
  );
};
