/* eslint-disable jsdoc/require-jsdoc */
import {
  type FC,
  type ReactNode,
  Fragment,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  type Response,
  type ApplicationMessage,
  type KnowledgeBaseResponseSource,
  ResponseType,
} from "../core";
import { clsx } from "clsx";

import {
  type AuthenticationStatus,
  type ConnectConversationHandler,
  type ResolvedView,
} from "../connect";
import { Authentication } from "./Authentication";

import { SafeMarkdown } from "./SafeMarkdown";
import { useCopy } from "../utils/useCopy";
import { Loader } from "./ui/Loader";
import { TextButton, TextButtonGroup } from "./ui/TextButton";
import { useIcons } from "../utils/useIcons";
import { UnsemanticIconButton } from "./ui/IconButton";
import { MessageStatusRow } from "./ui/MessageStatusRow";
import { MessageTimestamp } from "./ui/MessageTimestamp";
import { formatTimestamp } from "../utils/formatTimestamp";
import {
  type CustomModalityComponent,
  type ColorMode,
  type MessageStatus,
} from "../interface";
import { ErrorBoundary } from "react-error-boundary";
import { Notice } from "./Notice";
import {
  GuideCard,
  GuideModal,
  type GuideReference,
  type OpenGuide,
} from "./ui/GuideCard";
import { type CustomStyle } from "../utils/customStyle";
import { Banner } from "./ui/Banner";

export interface MessagesProps {
  interimMessage?: string;
  handler: ConnectConversationHandler;
  responses: Response[];
  userMessageBubble: boolean;
  agentMessageBubble: boolean;
  /** Show the time below user messages. */
  userMessageTimestamp?: boolean;
  /** Show the time below agent (automated or human) messages. */
  agentMessageTimestamp?: boolean;
  /** Already sanitized by the configuration normalization in `App`. */
  userMessageBubbleStyle?: CustomStyle;
  /** Already sanitized by the configuration normalization in `App`. */
  agentMessageBubbleStyle?: CustomStyle;
  showParticipantInfo: boolean;
  assistantName?: string;
  /** Optional custom avatar image for the assistant. */
  assistantIcon?: string;
  /** Avatar shape: round (default) or square. */
  avatarShape?: "round" | "square";
  /** Downloads a received attachment by id (Amazon Connect). */
  onDownloadAttachment?: (attachmentId: string) => void;
  /** Resolves an Amazon Connect View/Guide reference into its definition. */
  onDescribeView?: (viewToken: string) => Promise<ResolvedView | null>;
  /** Submits an Amazon Connect View/Guide action back to the contact flow. */
  onSubmitView?: (action: string, data: unknown, viewName?: string) => void;
  /** Opens the hosted IdP login for the active chat authentication session. */
  onAuthenticate?: () => void;
  /** Cancels the active chat authentication session (skips sign-in). */
  onCancelAuthentication?: () => void;
  /** Amazon Connect instance URL, used to load the view/guide renderer. */
  viewRendererInstanceUrl?: string;
  chatMode: boolean;
  colorMode: ColorMode;
  uploadedFiles: Record<string, File>;
  lastApplicationResponseIndex?: number;
  modalityComponents: Record<string, CustomModalityComponent<unknown>>;
  className?: string;
  enabled: boolean;
}

export const MessageChoices: FC<{
  handler: ConnectConversationHandler;
  message: ApplicationMessage;
  responseIndex: number;
  messageIndex: number;
}> = ({ handler, message, responseIndex, messageIndex }) => {
  const { Send } = useIcons();
  return message.choices.length > 0 ? (
    <TextButtonGroup
      role="group"
      aria-label="Response options"
      className="max-h-[40vh] overflow-auto no-scrollbar"
    >
      {message.choices.map((choice, key) =>
        message.selectedChoiceId == null ||
        choice.choiceId === message.selectedChoiceId ? (
          <TextButton
            key={key}
            type="grouped"
            Icon={Send}
            onClick={
              message.selectedChoiceId == null
                ? () => {
                    handler.sendChoice(
                      choice.choiceId,
                      {},
                      { responseIndex, messageIndex },
                    );
                  }
                : undefined
            }
            label={choice.choiceText}
          />
        ) : null,
      )}
    </TextButtonGroup>
  ) : null;
};

/**
 * Find the index of the first application message immediately following an escalation. We assume this means successful escalation.
 */
const findFirstIndexAfterEscalation = (
  responses: Response[],
): number | null => {
  let escalationIndex: number | null = null;
  for (const [responseIndex, response] of responses.entries()) {
    if (escalationIndex != null) {
      if (response.type === ResponseType.Application) {
        return responseIndex;
      }
    } else {
      if (
        response.type === ResponseType.Application &&
        response.payload.metadata?.escalation
      ) {
        escalationIndex = responseIndex;
      }
    }
  }
  return null;
};

const ParticipantAvatar: FC<{
  role: "you" | "bot" | "agent";
  name: string;
  /** Optional custom avatar image (e.g. the assistant's icon). */
  iconUrl?: string;
  /** Avatar shape: fully round (default) or square (inner radius). */
  shape?: "round" | "square";
}> = ({ role, name, iconUrl, shape = "round" }) => {
  const { Bot, Escalate, User } = useIcons();
  const radius = shape === "square" ? "rounded-none" : "rounded-full";
  if (iconUrl != null) {
    return (
      <img
        src={iconUrl}
        role="img"
        aria-label={name}
        title={name}
        className={clsx(
          "flex-none mt-0.5 size-4 object-cover object-center",
          radius,
        )}
      />
    );
  }
  const Icon = role === "you" ? User : role === "agent" ? Escalate : Bot;
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={clsx(
        "flex-none flex items-center justify-center size-5 mt-0.5",
        radius,
        "text-primary-60 bg-primary-10",
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
};

const AttachmentPill: FC<{
  name: string;
  onClick?: () => void;
}> = ({ name, onClick }) => {
  const { Attachment } = useIcons();
  return (
    <button
      type="button"
      disabled={onClick == null}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 w-fit max-w-full px-3 py-2 rounded-inner bg-primary-5 text-primary text-base",
        onClick != null ? "hover:bg-primary-10 cursor-pointer" : "",
      )}
    >
      <Attachment className="w-4 h-4 flex-none" />
      <span className="truncate">{name}</span>
    </button>
  );
};

/** The participant a response is attributed to, or null for system notices/failures. */
const senderKeyOf = (
  response: Response | undefined,
): "you" | "bot" | "agent" | null => {
  if (response == null) return null;
  if (response.type === ResponseType.User) return "you";
  if (response.type === ResponseType.Application) {
    return (
      (response as { participantRole?: "bot" | "agent" }).participantRole ??
      "bot"
    );
  }
  return null;
};

export const UserMessage: FC<{
  text: string;
  files?: File[];
  bubble: boolean;
  bubbleStyle?: CustomStyle;
  status?: MessageStatus;
  /** When set, the time is shown after the status below the message. */
  timestamp?: number;
  align?: "left" | "right";
}> = ({
  text,
  bubble,
  bubbleStyle,
  files,
  status,
  timestamp,
  align = "right",
}) => {
  const alignRight = align === "right";
  return (
    <div className="space-y-2">
      <div
        className={clsx(
          "flex text-base",
          alignRight ? "justify-end pl-12" : "justify-start",
        )}
      >
        <div
          className={clsx(
            "text-primary-90 rounded-inner whitespace-pre-wrap",
            bubble ? "bg-primary-10 px-3 py-2" : "",
          )}
          style={bubble ? bubbleStyle : undefined}
        >
          {text}
        </div>
      </div>
      {timestamp != null ? (
        <div
          className={clsx(
            "flex items-center gap-3",
            alignRight ? "justify-end pr-1" : "justify-start pl-1",
          )}
        >
          {status != null ? <MessageStatusRow status={status} /> : null}
          <MessageTimestamp time={timestamp} />
        </div>
      ) : status != null ? (
        <MessageStatusRow
          status={status}
          className={
            align === "right" ? "justify-end pr-1" : "justify-start pl-1"
          }
        />
      ) : null}
      {files != null ? (
        <div
          className={clsx(
            "flex flex-wrap gap-2",
            alignRight ? "justify-end" : "justify-start",
          )}
        >
          {files.map((file, index) => (
            // TODO: style
            <img
              className="rounded-inner h-20"
              key={index}
              src={URL.createObjectURL(file)}
              alt={file.name}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const NumberPill: FC<{ text: string; number: number | string }> = ({
  text,
  number,
}) => {
  return (
    <span className="flex items-center gap-2">
      <span className="bg-primary-10 text-primary-60 text-xs px-1.5 py-0.5 rounded-inner">
        {number}
      </span>
      {text}
    </span>
  );
};

interface SourceWithIndices {
  source: KnowledgeBaseResponseSource;
  indices: number[];
}

/**
 * The NLU currently sends multiple sources that are identical. This is because eventually there will be differences in page numbers,
 * but these are neither surfaced nor designed for, hence the need to de-duplicate it for the user while persisting the index (this is then
 * matched with [i] source index markers in the message body)
 * @param sources - Sources as returned by the application
 * @returns sources with indices
 */
const consolidateSources = (
  sources: KnowledgeBaseResponseSource[],
): SourceWithIndices[] => {
  const map = new Map<string, SourceWithIndices>();

  sources.forEach((source, index) => {
    const normalizedSource = {
      fileName: source.fileName,
      content: source.content,
      presignedUrl: source.presignedUrl,
      // These fields are currently ignored (also the reason why duplicates show up)
      metadata: undefined,
      pageNumber: undefined,
    };
    const key = JSON.stringify(normalizedSource);
    const existingEntry = map.get(key);
    map.set(
      key,
      existingEntry == null
        ? { source: normalizedSource, indices: [index] }
        : {
            ...existingEntry,
            indices: [...existingEntry.indices, index],
          },
    );
  });
  return [...map.values()];
};

const Sources: FC<{ sources: KnowledgeBaseResponseSource[] }> = ({
  sources,
}) => {
  const { ArrowDown, ArrowRight, OpenInNew } = useIcons();
  const [open, setOpen] = useState<boolean>(false);
  const consolidatedSources = useMemo(
    () => consolidateSources(sources),
    [sources],
  );
  if (consolidatedSources.length === 0) {
    return null;
  }
  return (
    <details
      className="space-y-2"
      open={open}
      onToggle={(ev) => {
        setOpen(ev.currentTarget.open);
      }}
    >
      <summary className="flex cursor-pointer items-center gap-2 rounded-inner hover:bg-primary-5 text-primary">
        <UnsemanticIconButton
          type="ghost"
          Icon={open ? ArrowDown : ArrowRight}
        />
        Sources
      </summary>
      <ol className="space-y-2">
        {consolidatedSources.map(({ source, indices }, sourceIndex) => {
          const displayName = source.fileName ?? source.content ?? "Source";
          const sharedClassName =
            "p-3 bg-primary-5 rounded-inner w-full flex items-center justify-between text-primary";
          const indicesDisplay = indices
            .map((index) => String(index + 1))
            .join(", ");
          return (
            <li key={sourceIndex}>
              {source.presignedUrl != null ? (
                <a
                  href={source.presignedUrl}
                  className={clsx(sharedClassName, "hover:bg-primary-10")}
                >
                  <NumberPill text={displayName} number={indicesDisplay} />
                  <OpenInNew className="w-4 h-4 text-primary-60" />
                </a>
              ) : (
                <div className={sharedClassName}>
                  <NumberPill text={displayName} number={indicesDisplay} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
};

export const Messages: FC<MessagesProps> = ({
  responses,
  colorMode,
  chatMode,
  uploadedFiles,
  userMessageBubble,
  agentMessageBubble,
  userMessageTimestamp = false,
  agentMessageTimestamp = false,
  userMessageBubbleStyle,
  agentMessageBubbleStyle,
  showParticipantInfo,
  assistantName,
  assistantIcon,
  avatarShape,
  onDownloadAttachment,
  onDescribeView,
  onSubmitView,
  onAuthenticate,
  onCancelAuthentication,
  viewRendererInstanceUrl,
  lastApplicationResponseIndex,
  interimMessage,
  modalityComponents,
  handler,
  className,
  enabled,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // The guide currently opened into its full-view modal, if any.
  const [activeGuide, setActiveGuide] = useState<OpenGuide | null>(null);

  const lastApplicationMessageRef = useRef<HTMLDivElement | null>(null);

  const isWaiting = interimMessage != null;

  useEffect(() => {
    if (!chatMode && !isWaiting) {
      setTimeout(() => {
        lastApplicationMessageRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      });
    }
  }, [isWaiting, chatMode]);

  useEffect(() => {
    if (chatMode) {
      const lastChild = containerRef.current?.lastChild;
      if (lastChild instanceof HTMLElement) {
        lastChild.scrollIntoView({ behavior: "smooth" });
      }
    }
    // `interimMessage` is included so the typing indicator (rendered as the last child,
    // not a response) is pulled into view when it appears in a long transcript.
  }, [responses.length, interimMessage, chatMode]);

  const firstIndexAfterEscalation = useMemo(
    () => findFirstIndexAfterEscalation(responses),
    [responses],
  );

  // Delivery status is shown only on the most recent user message, matching the
  // Amazon Connect widget.
  const lastUserResponseIndex = useMemo(() => {
    let index = -1;
    responses.forEach((response, responseIndex) => {
      if (response.type === ResponseType.User) index = responseIndex;
    });
    return index;
  }, [responses]);

  const copy = useCopy();

  // Avatar + name for the typing/interim indicator: the human agent if one is
  // active, otherwise the assistant.
  const interimAvatar = useMemo(() => {
    let agentActive = false;
    let agentName: string | undefined;
    responses.forEach((response) => {
      if (response.type === ResponseType.Notice) {
        const notice = response as {
          agentJoined?: boolean;
          agentLeft?: boolean;
        };
        if (notice.agentJoined === true) agentActive = true;
        else if (notice.agentLeft === true) agentActive = false;
      } else if (response.type === ResponseType.Application) {
        const participant = response as {
          participantRole?: "bot" | "agent";
          participantName?: string;
        };
        if (
          participant.participantRole === "agent" &&
          participant.participantName != null
        ) {
          agentName = participant.participantName;
        }
      }
    });
    return agentActive
      ? { role: "agent" as const, name: agentName ?? copy.participants.agent }
      : {
          role: "bot" as const,
          name: assistantName ?? copy.participants.bot,
        };
  }, [responses, copy, assistantName]);

  return (
    <div className={clsx("relative", className)}>
      <div
        data-theme={colorMode === "dark" ? "light" : "dark"}
        className={clsx(
          "absolute inset-x-0 h-px top-0 bg-background opacity-[0.01] backdrop-blur-md",
        )}
      />
      {!chatMode && isWaiting ? (
        <Loader
          label={interimMessage ?? "Thinking"}
          className="absolute inset-0"
        />
      ) : null}
      <div
        key="messages"
        className={clsx(
          "absolute inset-0 p-2 md:p-3 overflow-y-auto no-scrollbar space-y-8",
          !chatMode && isWaiting ? "opacity-0" : "opacity-100",
        )}
        ref={containerRef}
        // Deliberately not a live region: incoming responses are announced by the
        // `ConversationAnnouncer` mounted above every mode (see `Announcements.tsx`).
      >
        {responses.map((response, responseIndex) => {
          // When showParticipantInfo is enabled, every non-user message is laid out
          // left-aligned with the sender's avatar in a fixed gutter and the name + message
          // in the column beside it (matching the design). The avatar and name appear
          // only on the first message of a same-sender sequence.
          const senderKey = senderKeyOf(response);
          const isFirstInSequence =
            senderKey != null &&
            senderKey !== senderKeyOf(responses[responseIndex - 1]);
          const participantName =
            senderKey === "you"
              ? copy.participants.you
              : senderKey === "agent"
                ? ((response as { participantName?: string }).participantName ??
                  copy.participants.agent)
                : (assistantName ?? copy.participants.bot);
          // Tighten the gap between consecutive messages from the same sender
          // (e.g. a message followed by its attachment pill) — half of space-y-8.
          const continuationClass =
            showParticipantInfo && senderKey != null && !isFirstInSequence
              ? "-mt-4"
              : "";
          const wrap = (node: ReactNode): ReactNode =>
            showParticipantInfo && senderKey != null ? (
              <div className="flex gap-2">
                <div className="w-6 flex-none">
                  {isFirstInSequence ? (
                    <ParticipantAvatar
                      role={senderKey}
                      name={participantName}
                      iconUrl={senderKey === "bot" ? assistantIcon : undefined}
                      shape={avatarShape}
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {isFirstInSequence ? (
                    <div className="text-primary-60 text-base">
                      {participantName}
                    </div>
                  ) : null}
                  {node}
                </div>
              </div>
            ) : (
              node
            );

          // User messages stay right-aligned; with participant info shown they are
          // preceded by the user's name and avatar.
          const wrapUser = (node: ReactNode): ReactNode =>
            showParticipantInfo ? (
              <div className="space-y-1">
                <div className="flex items-center justify-end gap-2 text-primary-60 text-base">
                  <ParticipantAvatar
                    role="you"
                    name={copy.participants.you}
                    shape={avatarShape}
                  />
                  <span>{copy.participants.you}</span>
                </div>
                {node}
              </div>
            ) : (
              node
            );

          // Only the first message of a run of user messages gets the header.
          const wrapFirstUser = (node: ReactNode): ReactNode =>
            isFirstInSequence ? wrapUser(node) : node;

          // User response
          if (response.type === ResponseType.User) {
            const attachmentFile = (response as { attachmentFile?: File })
              .attachmentFile;
            if (attachmentFile != null) {
              return (
                <div key={responseIndex} className={continuationClass}>
                  {wrapFirstUser(
                    <div className="flex justify-end">
                      <AttachmentPill name={attachmentFile.name} />
                    </div>,
                  )}
                </div>
              );
            }
            if (response.payload.type === "text") {
              return (
                <div key={responseIndex} className={continuationClass}>
                  {wrapFirstUser(
                    <UserMessage
                      text={response.payload.text}
                      bubble={userMessageBubble}
                      bubbleStyle={userMessageBubbleStyle}
                      align="right"
                      timestamp={
                        userMessageTimestamp ? response.receivedAt : undefined
                      }
                      status={
                        responseIndex === lastUserResponseIndex
                          ? (response as Response & { status?: MessageStatus })
                              .status
                          : undefined
                      }
                    />,
                  )}
                </div>
              );
            } else if (
              response.payload.type === "structured" &&
              response.payload.utterance != null &&
              response.payload.uploadIds != null
            ) {
              return (
                <div key={responseIndex} className={continuationClass}>
                  {wrapFirstUser(
                    <UserMessage
                      bubble={userMessageBubble}
                      bubbleStyle={userMessageBubbleStyle}
                      align="right"
                      text={response.payload.utterance}
                      timestamp={
                        userMessageTimestamp ? response.receivedAt : undefined
                      }
                      files={response.payload.uploadIds
                        .map((uploadId) => uploadedFiles[uploadId])
                        .filter((file) => file != null)}
                    />,
                  )}
                </div>
              );
            } else {
              return null;
            }
          }

          // Failure
          if (response.type === ResponseType.Failure) {
            return (
              <Banner key={responseIndex} type="error">
                {response.payload.text}
              </Banner>
            );
          }

          // Notice
          if (response.type === ResponseType.Notice) {
            // Amazon Connect chat authentication card (Authenticate Customer).
            const authentication = (
              response as { authentication?: { status: AuthenticationStatus } }
            ).authentication;
            if (authentication != null) {
              return (
                <Authentication
                  key={responseIndex}
                  status={authentication.status}
                  onAuthenticate={() => onAuthenticate?.()}
                  onCancel={
                    onCancelAuthentication != null
                      ? () => onCancelAuthentication()
                      : undefined
                  }
                />
              );
            }
            return (
              <p
                className="text-center text-primary-60 text-base"
                key={responseIndex}
              >
                {response.payload.text}
              </p>
            );
          }

          // Application response
          // Within a run of messages from the same sender, a timestamp identical
          // to the one on the message below is omitted.
          const nextResponse = responses[responseIndex + 1];
          const showTimestamp =
            agentMessageTimestamp &&
            !(
              nextResponse != null &&
              senderKeyOf(nextResponse) === senderKey &&
              nextResponse.type === ResponseType.Application &&
              formatTimestamp(nextResponse.receivedAt) ===
                formatTimestamp(response.receivedAt)
            );
          const isLast =
            lastApplicationResponseIndex != null &&
            responseIndex === lastApplicationResponseIndex;
          return (
            <Fragment key={responseIndex}>
              {firstIndexAfterEscalation === responseIndex ? (
                <Notice text={copy.escalationNotice} />
              ) : null}
              {wrap(
                <div
                  className={clsx(
                    "space-y-2",
                    !chatMode && isLast ? "min-h-full" : "",
                  )}
                  ref={isLast ? lastApplicationMessageRef : undefined}
                >
                  {response.payload.messages.map((message, messageIndex) => {
                    return (
                      <div key={messageIndex} className="text-base">
                        <SafeMarkdown
                          className={clsx(
                            "space-y-6 markdown",
                            agentMessageBubble
                              ? "px-3 py-2 w-fit bg-secondary-40 mr-10 rounded-inner"
                              : "",
                          )}
                          style={
                            agentMessageBubble
                              ? agentMessageBubbleStyle
                              : undefined
                          }
                          contents={message.text}
                        />
                      </div>
                    );
                  })}
                  {(() => {
                    const guide = (response as { guide?: GuideReference })
                      .guide;
                    return guide != null ? (
                      <GuideCard
                        guide={guide}
                        onDescribeView={onDescribeView}
                        onOpen={setActiveGuide}
                      />
                    ) : null;
                  })()}
                  {(
                    (
                      response as {
                        attachments?: Array<{ id: string; name: string }>;
                      }
                    ).attachments ?? []
                  ).map((attachment) => (
                    <AttachmentPill
                      key={attachment.id}
                      name={attachment.name}
                      onClick={
                        onDownloadAttachment != null
                          ? () => {
                              onDownloadAttachment(attachment.id);
                            }
                          : undefined
                      }
                    />
                  ))}
                  {response.payload.metadata?.sources != null ? (
                    <Sources sources={response.payload.metadata.sources} />
                  ) : null}
                  <ErrorBoundary
                    fallback={
                      <Banner type="error">Something went wrong</Banner>
                    }
                  >
                    {Object.entries(response.payload.modalities ?? {}).map(
                      ([key, value]) => {
                        const Component = modalityComponents[key];
                        if (Component == null) {
                          // eslint-disable-next-line no-console
                          console.warn(
                            `Custom component implementation missing for the ${key} modality.`,
                          );
                          return null;
                        }
                        return (
                          <Component
                            key={key}
                            data={value}
                            conversationHandler={handler}
                            enabled={enabled}
                          />
                        );
                      },
                    )}
                  </ErrorBoundary>
                  {showTimestamp ? (
                    <MessageTimestamp time={response.receivedAt} block />
                  ) : null}
                </div>,
              )}
              {/* Render the selected choice text as a user message */}
              {response.payload.messages.map((message, messageIndex) => {
                if (message.selectedChoiceId != null) {
                  const selectedChoice = message.choices.find(
                    (choice) => choice.choiceId === message.selectedChoiceId,
                  );
                  if (selectedChoice == null) {
                    return null;
                  }
                  return (
                    <Fragment key={messageIndex}>
                      {wrapUser(
                        <UserMessage
                          text={selectedChoice.choiceText}
                          bubble={userMessageBubble}
                          bubbleStyle={userMessageBubbleStyle}
                        />,
                      )}
                    </Fragment>
                  );
                }
                return null;
              })}
              {
                /* An escalation has been triggered but no subsequent messages have been received yet. */
                response.payload.metadata?.escalation &&
                firstIndexAfterEscalation == null ? (
                  <div className="text-primary-40 text-base shimmer w-fit">
                    {copy.escalationAttemptNotice}
                  </div>
                ) : null
              }
            </Fragment>
          );
        })}
        {chatMode && interimMessage != null ? (
          showParticipantInfo ? (
            <div className="flex gap-2">
              <div className="w-6 flex-none">
                <ParticipantAvatar
                  role={interimAvatar.role}
                  name={interimAvatar.name}
                  iconUrl={
                    interimAvatar.role === "bot" ? assistantIcon : undefined
                  }
                  shape={avatarShape}
                />
              </div>
              <div className="flex-1 min-w-0 text-primary-40 text-base shimmer">
                {interimMessage}
              </div>
            </div>
          ) : (
            <div className="text-primary-40 text-base shimmer w-fit">
              {interimMessage}
            </div>
          )
        ) : null}
      </div>
      {activeGuide != null ? (
        <GuideModal
          title={activeGuide.title}
          view={activeGuide.view}
          viewName={activeGuide.viewName}
          instanceUrl={viewRendererInstanceUrl}
          onSubmit={(action, data, viewName) => {
            onSubmitView?.(action, data, viewName);
          }}
          onComplete={activeGuide.onComplete}
          onClose={() => {
            setActiveGuide(null);
          }}
        />
      ) : null}
    </div>
  );
};
