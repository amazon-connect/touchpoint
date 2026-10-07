/* eslint-disable jsdoc/require-jsdoc */
import { useState, type FC } from "react";
import { ProviderStack } from "../ProviderStack";
import { clsx } from "clsx";
import { Main, HeaderContainer, InputContainer } from "../components/Layout";
import { IconButton } from "../components/ui/IconButton";
import { Input } from "../components/Input";
import { Close, Settings as SettingsIcon } from "../components/ui/Icons";
import { Messages } from "../components/Messages";
import { mockConversationHandler, mockTheme, responses } from "./shared";
import { type WindowSize, type ColorMode, type Theme } from "../interface";
import { type CustomStyle } from "../utils/customStyle";
import { defaultModalities } from "../components/defaultModalities";
import { Settings } from "../components/Settings";

export const MockText: FC<{
  embedded: boolean;
  backgroundDepthLayer: boolean;
  colorMode?: ColorMode;
  onClose: () => void;
  windowSize: WindowSize;
  /** Theme overrides layered on top of the mock's own theme. */
  theme?: Partial<Theme>;
  /** Whether user messages are wrapped in a bubble. Defaults to `true`. */
  userMessageBubble?: boolean;
  /** Whether assistant messages are wrapped in a bubble. Defaults to `true`. */
  agentMessageBubble?: boolean;
  /** Inline style for the user message bubble. */
  userMessageBubbleStyle?: CustomStyle;
  /** Inline style for the assistant message bubble. */
  agentMessageBubbleStyle?: CustomStyle;
  /** Whether avatars and participant names are shown. Defaults to `false`. */
  showParticipantInfo?: boolean;
  /** Display name for the assistant, shown with participant info. */
  assistantName?: string;
  /** Participant avatar shape. */
  avatarShape?: "round" | "square";
}> = (props) => {
  const colorMode = props.colorMode ?? "dark";
  const { onClose, windowSize } = props;
  const theme = { ...mockTheme, ...props.theme };

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  return (
    <ProviderStack
      className={clsx(
        props.embedded
          ? "grid grid-cols-2 xl:grid-cols-[1fr_632px] w-full h-full"
          : windowSize === "floating"
            ? // Detached rounded card hovering over the page, as in `App`.
              "fixed z-touchpoint top-2 bottom-2 right-2 w-[calc(100vw-1rem)] sm:w-[420px] rounded-outer overflow-hidden shadow-2xl border border-solid border-primary-10"
            : "grid grid-cols-2 xl:grid-cols-[1fr_632px] fixed inset-0 z-touchpoint",
      )}
      theme={theme}
      colorMode={colorMode}
      languageCode="en-US"
    >
      {windowSize === "half" ? (
        <div className="hidden md:block bg-overlay" />
      ) : null}
      <Main
        windowSize={windowSize}
        backgroundDepthLayer={props.backgroundDepthLayer}
      >
        <HeaderContainer>
          <IconButton
            Icon={Close}
            label="Close"
            onClick={onClose}
            type="ghost"
          />
          <IconButton
            Icon={SettingsIcon}
            label="Settings"
            onClick={() => {
              setSettingsOpen(true);
            }}
            type="ghost"
          />
        </HeaderContainer>
        {settingsOpen ? (
          <Settings
            onRestart={() => {}}
            onDownloadTranscript={() => {}}
            onEndConversation={() => {}}
            agentActive={false}
            ended={false}
            className={clsx(
              windowSize === "full" ? "w-full md:max-w-content md:mx-auto" : "",
            )}
            onClose={() => {
              setSettingsOpen(false);
            }}
          />
        ) : (
          <>
            <Messages
              handler={mockConversationHandler}
              responses={responses}
              userMessageBubble={props.userMessageBubble ?? true}
              agentMessageBubble={props.agentMessageBubble ?? true}
              userMessageBubbleStyle={props.userMessageBubbleStyle}
              agentMessageBubbleStyle={props.agentMessageBubbleStyle}
              showParticipantInfo={props.showParticipantInfo ?? false}
              assistantName={props.assistantName}
              avatarShape={props.avatarShape}
              chatMode={true}
              colorMode={colorMode}
              uploadedFiles={{}}
              lastApplicationResponseIndex={3}
              modalityComponents={defaultModalities}
              enabled={true}
              className={clsx(
                "grow",
                windowSize === "full"
                  ? "w-full md:max-w-content md:mx-auto"
                  : "",
              )}
            />
            <InputContainer windowSize={windowSize}>
              <Input
                enabled
                handler={mockConversationHandler}
                onFileUpload={() => {}}
              />
            </InputContainer>
          </>
        )}
      </Main>
    </ProviderStack>
  );
};
