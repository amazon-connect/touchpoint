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
import { SafeMarkdown } from "./components/SafeMarkdown";
import { Loader } from "./components/ui/Loader";
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
import {
  buildConnectHandler,
  CONNECTING_INTERIM_MESSAGE,
  type AuthenticationStatus,
  type ConnectConversationHandler,
  type ResolvedView,
} from "./connect";
import { TextButton } from "./components/ui/TextButton";
import { Restart } from "./components/ui/Icons";
import { useCopy } from "./utils/useCopy";
import { useDraggable } from "./utils/useDraggable";

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
      Icon={Restart}
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
  getConversationHandler: () => ConnectConversationHandler;
  setCustomLiveSyncActions: (actions: LiveSyncCustomAction[]) => void;
  sendLiveSyncContext: (context: LiveSyncContextInput) => void;
}

const App = forwardRef<AppRef, Props>((props, ref) => {
  // Only text chat opens a Connect chat session. Voice/voice-mini use a WebRTC
  // contact instead, and "external" opens nothing on its own — it renders no UI
  // and only connects Live Sync to the provided contact ID.
  const chatEnabled = (props.input ?? "text") === "text";
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

  // Whether chat authentication is awaiting the customer (prompt / in progress).
  // While pending we lock the text input so the customer completes the auth card
  // (or the "continue without signing in" action) before typing.
  const authPending = useMemo(() => {
    for (let i = responses.length - 1; i >= 0; i -= 1) {
      const auth = (
        responses[i] as { authentication?: { status: AuthenticationStatus } }
      ).authentication;
      if (auth != null) {
        return auth.status === "prompt" || auth.status === "in_progress";
      }
    }
    return false;
  }, [responses]);

  const copy = useCopy();

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
    const connectHandler = handler as ConnectConversationHandler & {
      endConversation?: () => void;
      getConnectTranscript?: () => Promise<Array<Record<string, unknown>>>;
      downloadAttachment?: (attachmentId: string) => Promise<void>;
      describeView?: (viewToken: string) => Promise<ResolvedView | null>;
      submitView?: (payload: {
        action: string;
        data?: unknown;
        viewName?: string;
      }) => void;
      startAuthentication?: (redirectUri?: string) => Promise<void>;
      cancelAuthentication?: () => Promise<void>;
    };
    return {
      escalate: () => {
        handler.sendText(
          props.escalationPhrase ?? "I'd like to talk to an agent",
        );
      },
      startAuthentication: () => {
        void connectHandler.startAuthentication?.();
      },
      cancelAuthentication: () => {
        void connectHandler.cancelAuthentication?.();
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

  // Fires the public `onContactEnded` hook with a cancelable event and reports
  // whether the host cancelled the default action.
  const { onContactEnded } = props;
  const emitContactEnded = useCallback((): boolean => {
    const event = new Event("contactended", { cancelable: true });
    onContactEnded?.(event);
    return event.defaultPrevented;
  }, [onContactEnded]);

  // Called by the voice components when the call ends (Chime `MeetingEnded`,
  // e.g. an escalated agent hangs up). Default action: collapse the widget back
  // to the launcher — unless the host cancels it, or there is no launcher
  // (embedded), in which case the voice component shows an ended state instead.
  const handleVoiceEnded = useCallback(() => {
    const prevented = emitContactEnded();
    if (!prevented && _onClose != null) {
      hangUp();
      setIsExpanded(false);
    }
  }, [emitContactEnded, _onClose, hangUp]);

  // Chat contacts fire `onContactEnded` once when the transcript is marked ended.
  // (Voice inputs fire it from the voice components on call end.) There is no
  // default action for chat — the ended transcript stays visible.
  const chatContactEndedFired = useRef(false);
  useEffect(() => {
    if (input !== "text") {
      return;
    }
    if (conversationEnded && !chatContactEndedFired.current) {
      chatContactEndedFired.current = true;
      emitContactEnded();
    } else if (!conversationEnded) {
      chatContactEndedFired.current = false;
    }
  }, [conversationEnded, input, emitContactEnded]);

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

  // Detached layouts that leave the page visible and interactive (no overlay).
  const isFloating = !props.embedded && windowSize === "floating";
  const isSideBySide = !props.embedded && windowSize === "side-by-side";

  // Lets the user drag the (floating) Voice mini widget out of the way.
  const voiceMiniDrag = useDraggable();

  // Width of the docked/floating panel; the side-by-side layout narrows the host
  // page by this amount so both stay usable at once. Must match the panel's
  // `md:w-[...]` below.
  const dockedPanelWidth = "440px";

  // The side-by-side docked panel is only rendered for the chat / full-screen
  // voice experiences; voiceMini (its own small floating widget) and external
  // (no UI) return earlier and must never narrow the page.
  const dockedPanelVisible =
    isSideBySide && isExpanded && (input === "text" || input === "voice");

  // Side-by-side narrows the host page by the panel width on wider viewports, so
  // the page reflows next to Touchpoint instead of hiding behind it. Skipped on
  // small screens (where the panel covers the page) and always cleaned up.
  useEffect(() => {
    if (!dockedPanelVisible) {
      return;
    }
    const root = document.documentElement;
    const mql = window.matchMedia("(min-width: 768px)");
    const apply = (): void => {
      root.style.transition = "margin-right 0.3s ease";
      root.style.marginRight = mql.matches ? dockedPanelWidth : "";
    };
    apply();
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      root.style.marginRight = "";
    };
  }, [dockedPanelVisible]);

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
    // Once the customer has responded to this turn — by typing or by selecting a
    // choice, both of which append a User response after the choice-bearing
    // message — hide the choices immediately instead of waiting for the next
    // assistant reply to arrive.
    const respondedAfter = responses.some(
      (response, index) =>
        index > lastApplicationResponse.index &&
        response.type === ResponseType.User,
    );
    if (respondedAfter) {
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
  }, [lastApplicationResponse, responses]);

  // The immersive welcome screen: the opening assistant turn — every message
  // before the customer has interacted — rendered centered (optionally with the
  // latest message's choices) instead of as a top-anchored transcript. It stays
  // until the customer sends or selects something (a `User` response), so a
  // second assistant message doesn't cause a flash. Falls back to the normal
  // layout if any response carries modalities or a guide, or isn't a plain
  // assistant message (e.g. a Notice or Failure).
  const welcomeResponses = useMemo<ApplicationResponse[] | null>(() => {
    if (props.welcomeScreen === false) {
      return null;
    }
    if (input !== "text" || conversationEnded) {
      return null;
    }
    const applicationResponses: ApplicationResponse[] = [];
    for (const response of responses) {
      // Any user turn means the conversation has begun.
      if (response.type === ResponseType.User) {
        return null;
      }
      if (response.type !== ResponseType.Application) {
        return null;
      }
      if (Object.keys(response.payload.modalities ?? {}).length > 0) {
        return null;
      }
      if ((response as { guide?: unknown }).guide != null) {
        return null;
      }
      applicationResponses.push(response);
    }
    // May be empty during the connecting/thinking phase before the first message
    // arrives — the welcome screen shows a centered loader in that case.
    return applicationResponses;
  }, [props.welcomeScreen, input, conversationEnded, responses]);

  // While the chat session is still being established, the customer can't send
  // anything yet, so the input is hidden (in both the immersive and normal
  // layouts) until the connection is ready.
  const isConnecting = interimMessage === CONNECTING_INTERIM_MESSAGE;

  // When the welcome screen shows the brand logo centered, the header logo is
  // suppressed so there's a single logo; it returns once the conversation starts.
  const welcomeLogoActive =
    welcomeResponses != null &&
    props.welcomeScreenLogo !== false &&
    props.brandIcon != null;

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
    // Anchored bottom-right and draggable via the handle (translate offset). The
    // wrapper owns positioning + transform so the widget and its optional border
    // animation move together.
    return (
      <div
        ref={voiceMiniDrag.ref}
        className={clsx(
          "w-fit",
          props.embedded ? "" : "fixed z-touchpoint bottom-2 right-2",
        )}
        style={
          props.embedded
            ? undefined
            : {
                transform: `translate(${voiceMiniDrag.offset.x}px, ${voiceMiniDrag.offset.y}px)`,
              }
        }
      >
        <ProviderStack
          className="w-fit"
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
            onVoiceSessionEnded={handleVoiceEnded}
            renderCollapse={props.onClose != null}
            modalityComponents={modalityComponents}
            dragHandleProps={
              props.embedded ? undefined : voiceMiniDrag.handleProps
            }
          />
        </ProviderStack>
      </div>
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
    const inputBlock = (
      <div className="relative group">
        <Input
          enabled={props.enabled && !authPending}
          handler={handler}
          attachmentsEnabled={agentActive}
          uploadUrl={
            lastApplicationResponse?.response.payload.metadata?.uploadUrls?.[0]
          }
          onFileUpload={({ uploadId, file }) => {
            setUploadedFiles((prev) => ({
              ...prev,
              [uploadId]: file,
            }));
          }}
        />
        {authPending ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-outer bg-background backdrop-blur-overlay px-4 text-center opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
            <p className="text-sm text-primary-60">
              {copy.authentication?.lockedInputHint ??
                "Complete or skip authentication before continuing."}
            </p>
          </div>
        ) : null}
      </div>
    );

    // Immersive welcome screen for the first assistant message: greeting centered
    // vertically. With choices, the input is pulled up beneath the greeting and
    // the choices listed below it; a plain greeting keeps the input at the bottom.
    if (welcomeResponses != null) {
      const welcomeMessages = welcomeResponses
        .flatMap((response) => response.payload.messages)
        .filter(
          (message) => message.text != null && message.text.trim() !== "",
        );
      // The input stays hidden until the first assistant message arrives; while
      // connecting/thinking we show only the centered status (no avatar).
      const hasFirstMessage = welcomeMessages.length > 0;
      const showChoicesInline =
        hasFirstMessage &&
        choiceMessage != null &&
        choiceMessage.message.selectedChoiceId == null;
      const showLoader = !hasFirstMessage && interimMessage != null;
      const showWelcomeLogo = welcomeLogoActive && hasFirstMessage;
      return (
        <div className="flex flex-col grow overflow-hidden">
          <div className="grow flex flex-col items-center justify-center gap-6 overflow-auto p-2 md:p-3 w-full md:max-w-content md:mx-auto">
            {showWelcomeLogo ? (
              <img
                src={props.brandIcon}
                role="presentation"
                className="w-12 h-12 flex-none object-contain object-center"
              />
            ) : null}
            {welcomeMessages.length > 0 ? (
              <div className="markdown text-center text-lg text-primary-80 space-y-4">
                {welcomeMessages.map((message, index) => (
                  <SafeMarkdown key={index} contents={message.text} />
                ))}
              </div>
            ) : showLoader ? (
              <Loader label={interimMessage} />
            ) : null}
            {showChoicesInline ? (
              <div className="w-full space-y-2">
                {inputBlock}
                <MessageChoices {...choiceMessage} handler={handler} />
              </div>
            ) : null}
          </div>
          {hasFirstMessage && !showChoicesInline ? (
            <InputContainer windowSize={windowSize}>
              {inputBlock}
            </InputContainer>
          ) : null}
        </div>
      );
    }

    return (
      <>
        <Messages
          enabled={props.enabled}
          userMessageBubble={props.userMessageBubble ?? false}
          agentMessageBubble={props.agentMessageBubble ?? false}
          showParticipantInfo={props.showParticipantInfo ?? false}
          assistantName={props.assistantName}
          assistantIcon={props.assistantIcon}
          avatarShape={props.avatarShape}
          onDownloadAttachment={connectActions.downloadAttachment}
          onDescribeView={connectActions.describeView}
          onSubmitView={connectActions.submitView}
          onAuthenticate={connectActions.startAuthentication}
          onCancelAuthentication={connectActions.cancelAuthentication}
          viewRendererInstanceUrl={props.config?.instanceUrl}
          chatMode={props.chatMode ?? true}
          interimMessage={interimMessage}
          lastApplicationResponseIndex={lastApplicationResponse?.index}
          responses={responses}
          colorMode={colorMode}
          handler={handler}
          uploadedFiles={uploadedFiles}
          modalityComponents={modalityComponents}
          className={clsx(
            "grow",
            windowSize === "full" ? "w-full md:max-w-content md:mx-auto" : "",
          )}
        />
        <InputContainer windowSize={windowSize}>
          {conversationEnded ? (
            <StartNewConversationButton onClick={reset} />
          ) : isConnecting ? null : (
            <>
              {choiceMessage != null ? (
                <MessageChoices {...choiceMessage} handler={handler} />
              ) : null}
              {choiceMessage?.message.selectedChoiceId != null
                ? null
                : inputBlock}
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
        onVoiceSessionEnded={handleVoiceEnded}
      />
    </>
  );

  return (
    <ProviderStack
      className={clsx(
        props.embedded
          ? "grid grid-cols-2 xl:grid-cols-[1fr_632px] w-full h-full"
          : isFloating
            ? // Detached rounded card hovering over the page (page stays interactive).
              "fixed z-touchpoint top-2 bottom-2 right-2 w-[calc(100vw-1rem)] sm:w-[420px] rounded-outer overflow-hidden shadow-2xl"
            : isSideBySide
              ? // Docked to the right edge for the full height; the page reflows beside it.
                "fixed z-touchpoint top-0 bottom-0 right-0 w-full md:w-[440px] border-l border-primary-10"
              : // half / full overlay covering the viewport.
                "grid grid-cols-2 xl:grid-cols-[1fr_632px] fixed inset-0 z-touchpoint",
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
        <>
          <Header
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
      </Main>
    </ProviderStack>
  );
});

App.displayName = "App";

export default App;
