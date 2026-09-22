import { describe, expect, it } from "vitest";
import { ResponseType, type Response } from "@nlxai/core";

import { conversationAnnouncement, spokenText } from "./Announcements";
import { defaultCopy } from "../utils/useCopy";

const copy = defaultCopy("en-US");

const announce = (
  responses: Response[],
  interimMessage?: string,
): { key: string; text: string } =>
  conversationAnnouncement({ responses, interimMessage }, copy);

const userTurn = (text: string): Response =>
  ({
    type: ResponseType.User,
    receivedAt: 0,
    payload: { type: "text", text },
  }) as unknown as Response;

const reply = (
  messages: Array<{ text: string; choices?: string[] }>,
  extras?: Record<string, unknown>,
): Response =>
  ({
    type: ResponseType.Application,
    receivedAt: 0,
    payload: {
      messages: messages.map(({ text, choices }) => ({
        text,
        choices: (choices ?? []).map((choiceText) => ({
          choiceId: choiceText,
          choiceText,
        })),
      })),
    },
    ...extras,
  }) as unknown as Response;

const failure = (text: string): Response =>
  ({
    type: ResponseType.Failure,
    receivedAt: 0,
    payload: { text },
  }) as unknown as Response;

const notice = (text: string, extras?: Record<string, unknown>): Response =>
  ({
    type: ResponseType.Notice,
    receivedAt: 0,
    payload: { text },
    ...extras,
  }) as unknown as Response;

describe("spokenText", () => {
  it("speaks the words of a message rather than its Markdown", () => {
    expect(spokenText("Your **balance** is [$10](https://example.test).")).toBe(
      "Your balance is $10.",
    );
  });

  it("breaks a list into sentences rather than one run-on line", () => {
    // Without block boundaries this reads as "checkingsavings".
    expect(spokenText("- Checking\n- Savings")).toBe("Checking. Savings.");
  });

  it("does not leave HTML escapes to be read out", () => {
    // Left encoded, JAWS says "amp".
    expect(spokenText('Tom & Jerry\'s "best"')).toBe('Tom & Jerry\'s "best".');
  });

  it("reads a table cell by cell, header row included", () => {
    expect(spokenText("| a | b |\n| - | - |\n| 1 | 2 |")).toBe("a. b. 1. 2.");
  });

  it("speaks no code from embedded markup", () => {
    expect(spokenText("Hi <script>alert(1)</script> there")).toBe("Hi there.");
  });
});

describe("conversationAnnouncement", () => {
  it("says nothing before the conversation starts", () => {
    expect(announce([])).toEqual({ key: "idle", text: "" });
  });

  it("confirms that a sent message went out", () => {
    expect(announce([userTurn("balance")]).text).toBe("Thinking");
  });

  it("prefers the application's own progress text while it lasts", () => {
    const responses = [userTurn("balance")];
    expect(announce(responses, "Checking your account").text).toBe(
      "Checking your account",
    );
    expect(announce(responses, "Almost there").key).not.toBe(
      announce(responses, "Checking your account").key,
    );
  });

  it("speaks the reply, and how many choices came with it", () => {
    expect(
      announce([
        userTurn("balance"),
        reply([{ text: "Which account?", choices: ["Checking", "Savings"] }]),
      ]).text,
    ).toBe("Which account? 2 options to choose from");
  });

  it("uses the singular for a lone choice", () => {
    expect(announce([reply([{ text: "Ready?", choices: ["Yes"] }])]).text).toBe(
      "Ready? 1 option to choose from",
    );
  });

  it("re-announces when a turn streams a second message into it", () => {
    const first = announce([userTurn("balance"), reply([{ text: "One" }])]);
    const second = announce([
      userTurn("balance"),
      reply([{ text: "One" }, { text: "Two" }]),
    ]);
    expect(second.text).toBe("One. Two.");
    expect(second.key).not.toBe(first.key);
  });

  it("names an attachment, which is otherwise silent", () => {
    expect(
      announce([
        reply([{ text: "" }], {
          attachments: [{ id: "1", name: "invoice.pdf" }],
        }),
      ]).text,
    ).toBe("invoice.pdf");
  });

  it("mentions a guide, which arrives without text of its own", () => {
    expect(
      announce([reply([{ text: "" }], { guide: { viewId: "v1" } })]).text,
    ).toBe("Guide");
  });

  it("falls back to a generic acknowledgement for a wordless reply", () => {
    expect(announce([userTurn("balance"), reply([{ text: "" }])]).text).toBe(
      "Response received",
    );
  });

  it("announces a failure ahead of any progress text left on screen", () => {
    expect(
      announce(
        [userTurn("balance"), failure("Something went wrong")],
        "Checking your account",
      ).text,
    ).toBe("Something went wrong");
  });

  it("announces a notice even while the agent is typing", () => {
    expect(
      announce([userTurn("hi"), notice("An agent has joined")], "Typing").text,
    ).toBe("An agent has joined");
  });

  it("speaks the localized status of an authentication card", () => {
    expect(
      announce([notice("", { authentication: { status: "in_progress" } })])
        .text,
    ).toBe("Authentication in progress");
  });

  it("keeps the same key while nothing has changed", () => {
    const responses = [userTurn("balance"), reply([{ text: "One" }])];
    expect(announce(responses).key).toBe(announce(responses).key);
  });
});
