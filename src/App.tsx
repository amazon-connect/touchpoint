/* eslint-disable jsdoc/require-jsdoc */
import {
  type ReactNode,
  type FC,
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from "react";
import {
  type ConversationHandler,
  ResponseType,
  type Subscriber,
  type Response,
  type ApplicationResponse,
} from "@nlxai/core";
import { clsx } from "clsx";
import { findLastIndex } from "ramda";

import { ProviderStack } from "./ProviderStack";
import { LaunchButton } from "./components/ui/LaunchButton";
import { Header } from "./components/Header";
import { FullscreenVoice } from "./components/FullscreenVoice";
import { Settings } from "./components/Settings";
import { MessageChoices, Messages } from "./components/Messages";
import { FullscreenError } from "./components/FullscreenError";
import { Input } from "./components/Input";
import type {
  WindowSize,
  ChoiceMessage,
  LiveSyncCustomAction,
  LiveSyncContextInput,
  PageState,
} from "./interface";
import type { NormalizedTouchpointConfiguration } from "./types";
import { VoiceMini } from "./components/VoiceMini";
import { actionHandler } from "./liveSync/actionHandler";
import { RiveAnimation } from "./components/RiveAnimation";
import { Main, InputContainer } from "./components/Layout";
import { buildConnectHandler, type ResolvedView } from "./connect";
import { TextButton } from "./components/ui/TextButton";
import { Refresh } from "./components/ui/Icons";
import { useCopy } from "./utils/useCopy";

import { useFeedback } from "./feedback";
import { FeedbackComment } from "./components/FeedbackComment";

/**
 * Fetches the server-side transcript and downloads it as a readable .txt file.
 * @param handler - the Connect conversation handler with a transcript getter
 */
const downloadTranscript = async (handler: {
  getConnectTranscript?: () => Promise<Array<Record<string, unknown>>>;
}): Promise<void> => {
  const items = (await handler.getConnectTranscript?.()) ?? [];
  const asString = (value: unknown): string =>
    typeof value === "string" ? value : "";
  const lines = items
    .map((item) => {
      const content = item.Content;
      if (typeof content !== "string" || content === "") return null;
      const name = asString(item.DisplayName) || asString(item.ParticipantRole);
      const time = asString(item.AbsoluteTime);
      return `[${time}] ${name}: ${content}`;
    })
    .filter((line): line is string => line != null);
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "chat-transcript.txt";
  anchor.click();
  URL.revokeObjectURL(url);
};

/**
 * Footer button shown after the conversation has ended, which starts a new one.
 * Rendered inside the copy provider so it can read localized labels.
 * @param props - button props
 * @param props.onClick - called to start a new conversation
 * @returns the start-new-conversation button
 */
const StartNewConversationButton: FC<{ onClick: () => void }> = ({
  onClick,
}) => {
  const copy = useCopy();
  return (
    <TextButton
      type="ghost"
      label={copy.startNewConversationButtonLabel}
      Icon={Refresh}
      onClick={onClick}
    />
  );
};

/**
 * Main Touchpoint creation properties object
 */
interface Props extends NormalizedTouchpointConfiguration {
  embedded: boolean;
  onClose: ((event: Event) => void) | null;
  enableSettings: boolean;
  enabled: boolean;
}

export interface AppRef {
  setExpanded: (val: boolean) => void;
  getExpanded: () => boolean;
  getConversationHandler: () => ConversationHandler;
  setCustomLiveSyncActions: (actions: LiveSyncCustomAction[]) => void;
  sendLiveSyncContext: (context: LiveSyncContextInput) => void;
}

const App = forwardRef<AppRef, Props>((props, ref) => {
  // Voice inputs use a WebRTC contact, not chat — don't open a chat session for them.
  const chatEnabled =
    props.input !== "voice" && props.input !== "voiceMini";
  const handler = useMemo(
    () =>
      buildConnectHandler(props.config, props.languageCode, props.liveSync, {
        chatEnabled,
      }),
    [props.config, props.languageCode, props.liveSync, chatEnabled],
  );

  const conversationId = handler.currentConversationId();

  const restoredConversation =
    conversationId != null &&
    sessionStorage.getItem("touchpointActiveVoiceConversationId") ===
      conversationId;

  const responseData = useMemo(() => {
    const responsesData =
      sessionStorage.getItem("touchpointActiveConversationResponses") ?? "{}";
    try {
      const responses = JSON.parse(responsesData);
      if (conversationId != null && Array.isArray(responses[conversationId])) {
        return responses[conversationId];
      }
    } catch (_err) {
      return null;
    }
  }, [conversationId]);

  const [interimMessage, setInterimMessage] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    handler.addEventListener("interimMessage", setInterimMessage);
    return () => {
      handler.removeEventListener("interimMessage", setInterimMessage);
    };
  }, [handler, setInterimMessage]);

  const [responses, setResponses] = useState<Response[]>([]);

  const colorMode = props.colorMode ?? "dark";

  const [isExpanded, setIsExpanded] = useState(
    props.embedded || props.input === "external" || restoredConversation,
  );

  const configValid =
    props.config?.chatEndpoint != null || props.config?.details != null;

  // The handler tags the "Conversation has ended" notice; when present, the input
  // is replaced with a "Start new conversation" button.
  const conversationEnded = useMemo(
    () =>
      responses.some(
        (response) =>
          response.type === ResponseType.Notice &&
          (response as { conversationEnded?: boolean }).conversationEnded ===
            true,
      ),
    [responses],
  );

  // Whether a human agent is currently active (from the tagged join/leave notices),
  // used to disable bot-only settings options.
  const agentActive = useMemo(() => {
    let active = false;
    responses.forEach((response) => {
      if (response.type === ResponseType.Notice) {
        const notice = response as {
          agentJoined?: boolean;
          agentLeft?: boolean;
        };
        if (notice.agentJoined === true) active = true;
        else if (notice.agentLeft === true) active = false;
      }
    });
    return active;
  }, [responses]);

  const connectActions = useMemo(() => {
    const connectHandler = handler as ConversationHandler & {
      endConversation?: () => void;
      getConnectTranscript?: () => Promise<Array<Record<string, unknown>>>;
      downloadAttachment?: (attachmentId: string) => Promise<void>;
      describeView?: (viewToken: string) => Promise<ResolvedView | null>;
      submitView?: (payload: {
        action: string;
        data?: unknown;
        viewName?: string;
      }) => void;
    };
    return {
      escalate: () => {
        handler.sendText(
          props.escalationPhrase ?? "I'd like to talk to an agent",
        );
      },
      endConversation: () => {
        connectHandler.endConversation?.();
      },
      downloadTranscript: () => {
        void downloadTranscript(connectHandler);
      },
      downloadAttachment: (attachmentId: string) => {
        void connectHandler.downloadAttachment?.(attachmentId);
      },
      describeView: connectHandler.describeView,
      submitView: (action: string, data: unknown, viewName?: string) => {
        connectHandler.submitView?.({ action, data, viewName });
      },
    };
  }, [handler, props.escalationPhrase]);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const isExpandedRef = useRef<boolean>(
    props.embedded || props.input === "external" || restoredConversation,
  );

  const input = props.input ?? "text";

  const hangUp = useCallback(() => {
    sessionStorage.removeItem("touchpointActiveVoiceConversationId");
    if (input === "voice" || input === "voiceMini") {
      conversationInitialized.current = false;
      handler.reset({ clearResponses: true });
      sessionStorage.removeItem("touchpointConversationId");
    }
  }, [handler, input]);
  const _onClose = props.onClose;
  const onClose = useCallback(
    (event: Event) => {
      if (_onClose != null) {
        _onClose(event);
        hangUp();
        if (!event.defaultPrevented) {
          setIsExpanded(false);
        }
      }
    },
    [_onClose, setIsExpanded, hangUp],
  );

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const pageState = useRef<PageState>({
    formElements: {},
    links: {},
    customActions: new Map(),
  });

  // The Live Sync context the app has declared: custom actions (with handlers), scope tags,
  // and fields. Sent to the assistant explicitly via `sendContext` — no page scraping.
  const liveSyncContextRef = useRef<{
    actions: LiveSyncCustomAction[];
    scopes?: string[];
    fields?: LiveSyncContextInput["fields"];
    destinations?: string[];
  }>({ actions: [] });

  const sendLiveSyncContext = useCallback(
    (context: LiveSyncContextInput) => {
      const next = {
        actions: context.actions ?? liveSyncContextRef.current.actions,
        scopes: context.scopes ?? liveSyncContextRef.current.scopes,
        fields: context.fields ?? liveSyncContextRef.current.fields,
        destinations:
          context.destinations ?? liveSyncContextRef.current.destinations,
      };
      liveSyncContextRef.current = next;
      // Keep the dispatch map for incoming custom actions in sync.
      pageState.current.customActions = new Map(
        next.actions.map((action) => [action.action, action.handler]),
      );
      void handler.sendContext({
        "nlx:vpContext": {
          actions: next.actions
            .filter((action) => action.description != null)
            .map(({ handler: _handler, ...rest }) => rest),
          ...(next.scopes != null ? { scopes: next.scopes } : {}),
          ...(next.fields != null ? { fields: next.fields } : {}),
          ...(next.destinations != null
            ? { destinations: next.destinations }
            : {}),
        },
      });
    },
    [handler],
  );

  useImperativeHandle(ref, () => {
    return {
      setExpanded(val: boolean) {
        if (val) {
          setIsExpanded(true);
        } else {
          hangUp();
          setIsExpanded(false);
        }
      },
      getExpanded() {
        return isExpandedRef.current;
      },
      getConversationHandler() {
        return handler;
      },
      setCustomLiveSyncActions: (actions: LiveSyncCustomAction[]) => {
        sendLiveSyncContext({ actions });
      },
      sendLiveSyncContext: (context: LiveSyncContextInput) => {
        sendLiveSyncContext(context);
      },
    };
  }, [handler, setIsExpanded, hangUp, sendLiveSyncContext]);

  useEffect(() => {
    const fn: Subscriber = (responses) => {
      setResponses(responses);
      const conversationId = handler.currentConversationId();
      if (input === "text" && conversationId != null) {
        sessionStorage.setItem(
          "touchpointActiveConversationResponses",
          JSON.stringify({ [conversationId]: responses }),
        );
      }
    };
    handler.subscribe(fn);
    return () => {
      handler.unsubscribe(fn);
    };
  }, [handler, setResponses, input]);

  const conversationInitialized = useRef<boolean>(restoredConversation);

  useEffect(() => {
    if (!isExpanded || conversationInitialized.current) {
      return;
    }
    conversationInitialized.current = true;

    if (input !== "text" || responseData == null || responseData.length === 0) {
      props.initializeConversation(handler, props.initialContext);
    }
    const newConversationId = handler.currentConversationId();
    if (newConversationId != null)
      sessionStorage.setItem(
        "touchpointActiveVoiceConversationId",
        newConversationId,
      );
  }, [handler, isExpanded, hangUp, input, props, responseData]);

  useEffect(() => {
    if (props.liveSync != null) {
      return actionHandler(handler, props.liveSync, pageState);
    }
  }, [props.liveSync, handler]);

  const windowSize: WindowSize =
    props.windowSize ?? (props.embedded ? "full" : "half");

  const lastApplicationResponse = useMemo<{
    index: number;
    response: ApplicationResponse;
  } | null>(() => {
    const index = findLastIndex(
      (res) => res.type === ResponseType.Application,
      responses,
    );
    if (index === -1) {
      return null;
    }
    const response = responses[index];
    if (response?.type !== ResponseType.Application) {
      return null;
    }
    return { index, response };
  }, [responses]);

  const choiceMessage = useMemo<ChoiceMessage | undefined>(() => {
    if (lastApplicationResponse == null) {
      return;
    }
    const choiceMessageIndex = findLastIndex((message) => {
      return message.choices.length > 0;
    }, lastApplicationResponse.response.payload.messages);
    if (choiceMessageIndex === -1) {
      return;
    }
    const choiceMessage =
      lastApplicationResponse.response.payload.messages[choiceMessageIndex];
    if (choiceMessage == null) {
      return;
    }
    return {
      message: choiceMessage,
      messageIndex: choiceMessageIndex,
      responseIndex: lastApplicationResponse.index,
    };
  }, [lastApplicationResponse]);

  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  const modalityComponents = useMemo(
    () => props.modalityComponents ?? props.customModalities ?? {},
    [props.modalityComponents, props.customModalities],
  );

  const [fullscreenVoiceSpeakersEnabled, setFullscreenVoiceSpeakersEnabled] =
    useState<boolean>(true);

  // Used as key to voice components so they are destroyed and re-initialized e.g. on conversation reset
  const [voiceKey, setVoiceKey] = useState<number>(0);

  const reset = (): void => {
    handler.reset({ clearResponses: true });
    hangUp();
    if (input !== "voice") {
      props.initializeConversation(handler, props.initialContext);
    }
    const newConversationId = handler.currentConversationId();
    if (sessionStorage.getItem("touchpointConversationId") !== null) {
      if (newConversationId == null) {
        sessionStorage.removeItem("touchpointConversationId");
      } else {
        sessionStorage.setItem("touchpointConversationId", newConversationId);
      }
    }

    if (newConversationId != null) {
      sessionStorage.setItem(
        "touchpointActiveVoiceConversationId",
        newConversationId,
      );
    }
    setVoiceKey((prev) => prev + 1);
  };

  const [feedbackState, feedbackActions] = useFeedback(handler);

  if (handler == null) {
    return null;
  }

  if (input === "external") return null;

  if (!isExpanded) {
    return props.launchIcon !== false ? (
      <ProviderStack
        className="fixed z-launch-button bottom-2 right-2 w-fit"
        theme={props.theme}
        colorMode={colorMode}
        languageCode={props.languageCode}
        copy={props.copy}
      >
        <LaunchButton
          className="backdrop-blur-sm"
          iconUrl={
            typeof props.launchIcon === "string" ? props.launchIcon : undefined
          }
          Custom={
            typeof props.launchIcon === "function"
              ? props.launchIcon
              : undefined
          }
          onClick={() => {
            setIsExpanded(true);
          }}
          label="Expand chat"
        />
      </ProviderStack>
    ) : null;
  }

  if (input === "voiceMini") {
    return (
      <ProviderStack
        className={clsx(
          "w-fit",
          props.embedded ? "" : "fixed z-touchpoint bottom-2 right-2",
        )}
        theme={props.theme}
        colorMode={colorMode}
        languageCode={props.languageCode}
        copy={props.copy}
      >
        {props.animate ? (
          <RiveAnimation restored={restoredConversation} />
        ) : null}
        <VoiceMini
          key={voiceKey}
          handler={handler}
          responses={responses}
          showTranscript={props.showVoiceTranscript ?? false}
          context={props.initialContext}
          brandIcon={props.brandIcon}
          onClose={() => {
            onClose(new Event("close"));
          }}
          renderCollapse={props.onClose != null}
          modalityComponents={modalityComponents}
        />
      </ProviderStack>
    );
  }

  const textContent = (): ReactNode => {
    if (isSettingsOpen) {
      return (
        <Settings
          onRestart={() => {
            reset();
            setIsSettingsOpen(false);
          }}
          onEscalate={connectActions.escalate}
          onDownloadTranscript={connectActions.downloadTranscript}
          onEndConversation={connectActions.endConversation}
          agentActive={agentActive}
          ended={conversationEnded}
          className={clsx(
            windowSize === "full" ? "w-full md:max-w-content md:mx-auto" : "",
          )}
          onClose={() => {
            setIsSettingsOpen(false);
          }}
        />
      );
    }
    if (!configValid) {
      return <FullscreenError />;
    }
    return (
      <>
        <Messages
          enabled={props.enabled}
          userMessageBubble={props.userMessageBubble ?? false}
          agentMessageBubble={props.agentMessageBubble ?? false}
          showParticipantInfo={props.showParticipantInfo ?? false}
          assistantName={props.assistantName}
          onDownloadAttachment={connectActions.downloadAttachment}
          onDescribeView={connectActions.describeView}
          onSubmitView={connectActions.submitView}
          viewRendererInstanceUrl={props.config?.instanceUrl}
          chatMode={props.chatMode ?? true}
          interimMessage={interimMessage}
          lastApplicationResponseIndex={lastApplicationResponse?.index}
          responses={responses}
          colorMode={colorMode}
          handler={handler}
          uploadedFiles={uploadedFiles}
          modalityComponents={modalityComponents}
          feedbackState={feedbackState}
          feedbackActions={feedbackActions}
          className={clsx(
            "grow",
            windowSize === "full" ? "w-full md:max-w-content md:mx-auto" : "",
          )}
        />
        <InputContainer windowSize={windowSize}>
          {conversationEnded ? (
            <StartNewConversationButton onClick={reset} />
          ) : (
            <>
              {choiceMessage != null ? (
                <MessageChoices {...choiceMessage} handler={handler} />
              ) : null}
              {choiceMessage?.message.selectedChoiceId != null ? null : (
                <Input
                  enabled={props.enabled}
                  handler={handler}
                  attachmentsEnabled={agentActive}
                  uploadUrl={
                    lastApplicationResponse?.response.payload.metadata
                      ?.uploadUrls?.[0]
                  }
                  onFileUpload={({ uploadId, file }) => {
                    setUploadedFiles((prev) => ({
                      ...prev,
                      [uploadId]: file,
                    }));
                  }}
                />
              )}
            </>
          )}
        </InputContainer>
      </>
    );
  };

  const voiceContent = (
    <>
      {isSettingsOpen ? (
        <Settings
          className={clsx(
            windowSize === "full" ? "w-full md:max-w-content md:mx-auto" : "",
          )}
          onClose={() => {
            setIsSettingsOpen(false);
          }}
          onRestart={() => {
            reset();
            setIsSettingsOpen(false);
          }}
          onEscalate={connectActions.escalate}
          onDownloadTranscript={connectActions.downloadTranscript}
          onEndConversation={connectActions.endConversation}
          agentActive={agentActive}
          ended={conversationEnded}
          voiceMode
        />
      ) : null}
      <FullscreenVoice
        key={voiceKey}
        responses={responses}
        brandIcon={props.brandIcon}
        showTranscript={props.showVoiceTranscript ?? false}
        handler={handler}
        speakersEnabled={fullscreenVoiceSpeakersEnabled}
        colorMode={colorMode}
        className={clsx(
          /**
           * IMPORTANT: when settings are open, the component must still be mounted, even if hidden by CSS, as it has local state and effects
           * that keep the call going.
           */
          isSettingsOpen ? "hidden" : "grow",
          windowSize === "full" ? "w-full md:max-w-content md:mx-auto" : "",
        )}
        context={props.initialContext}
        modalityComponents={modalityComponents}
      />
    </>
  );

  return (
    <ProviderStack
      className={clsx(
        "grid grid-cols-2 xl:grid-cols-[1fr_632px]",
        props.embedded ? "w-full h-full" : "fixed inset-0 z-touchpoint",
      )}
      theme={props.theme}
      colorMode={colorMode}
      languageCode={props.languageCode}
      copy={props.copy}
    >
      {windowSize === "half" ? (
        <div className="hidden md:block bg-overlay" />
      ) : null}
      <Main windowSize={windowSize}>
        {feedbackState.comment.state !== "idle" ? (
          <FeedbackComment
            feedbackActions={feedbackActions}
            feedbackState={feedbackState}
          />
        ) : (
          <>
            <Header
              windowSize={props.embedded ? "embedded" : windowSize}
              errorThemedCloseButton={input === "voice"}
              speakerControls={
                input === "voice"
                  ? {
                      enabled: fullscreenVoiceSpeakersEnabled,
                      setEnabled: setFullscreenVoiceSpeakersEnabled,
                    }
                  : undefined
              }
              colorMode={colorMode}
              brandIcon={
                /* In fullscreen voice mode, a separate header brand icon is not necessary because a brand icon+ripple are rendered in the middle */
                input === "text" ? props.brandIcon : undefined
              }
              isSettingsOpen={isSettingsOpen}
              enabled={props.enabled}
              toggleSettings={
                props.enableSettings
                  ? () => {
                      setIsSettingsOpen((prev) => !prev);
                    }
                  : undefined
              }
              renderCollapse={props.onClose != null}
              collapse={onClose}
              reset={reset}
            />
            {input === "text" ? textContent() : voiceContent}
          </>
        )}
      </Main>
    </ProviderStack>
  );
});

App.displayName = "App";

export default App;
