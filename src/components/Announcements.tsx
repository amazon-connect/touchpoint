/* eslint-disable jsdoc/require-jsdoc */
import { type FC } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
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

/**
 * The words to speak for a Markdown message. Runs the same `marked` parse the
 * transcript uses (see {@link SafeMarkdown}) and keeps only the text, so asterisks
 * are not read out and no link or button is duplicated into the tab order.
 */
export const spokenText = (markdown: string): string => {
  // The sentence break goes inside the block rather than in place of its closing
  // tag: DOMPurify parses before it strips, and a table whose `</td>` is gone
  // loses the cell's text entirely.
  const withBoundaries = marked(markdown, { async: false })
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(blockEnd, ". $&");
  // `ALLOWED_TAGS: []` drops every element but keeps its text, and reading
  // `textContent` off the returned node decodes entities on the way out — left
  // encoded, `&amp;` is spoken as "amp". The default `FORBID_CONTENTS` discards
  // the text of `<thead>` too, which would silence a table's header row.
  const text =
    DOMPurify.sanitize(withBoundaries, {
      ALLOWED_TAGS: [],
      FORBID_CONTENTS: ["script", "style"],
      RETURN_DOM: true,
    }).textContent ?? "";
  return (
    text
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
