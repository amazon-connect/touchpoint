/* eslint-disable jsdoc/require-jsdoc */
import { useState, type FC } from "react";
import { clsx } from "clsx";

import { ProviderStack } from "../ProviderStack";
import { Main, HeaderContainer } from "../components/Layout";
import { IconButton } from "../components/ui/IconButton";
import { Close, Mic, Settings as SettingsIcon } from "../components/ui/Icons";
import { mockConversationHandler, mockTheme, responses } from "./shared";
import { type WindowSize, type ColorMode, type Theme } from "../interface";
import { VoiceIcon } from "../components/FullscreenVoice";
import { defaultModalities } from "../components/defaultModalities";
import { VoiceModalities } from "../components/VoiceModalities";
import { Ripple } from "../components/Ripple";
import { Settings } from "../components/Settings";

export const MockVoice: FC<{
  embedded: boolean;
  backgroundDepthLayer: boolean;
  colorMode?: ColorMode;
  onClose: () => void;
  windowSize: WindowSize;
  /** Theme overrides layered on top of the mock's own theme. */
  theme?: Partial<Theme>;
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
        {
          <>
            {settingsOpen ? (
              <Settings
                onRestart={() => {}}
                onDownloadTranscript={() => {}}
                onEndConversation={() => {}}
                agentActive={false}
                ended={false}
                className={clsx(
                  windowSize === "full"
                    ? "w-full md:max-w-content md:mx-auto"
                    : "",
                )}
                onClose={() => {
                  setSettingsOpen(false);
                }}
              />
            ) : null}
            <div
              className={clsx(
                "grow flex-col",
                windowSize === "full"
                  ? "w-full md:max-w-content md:mx-auto"
                  : "",
                settingsOpen ? "hidden" : "flex",
              )}
            >
              <div className="relative grow">
                <div className="absolute inset-0 flex items-center justify-center">
                  <VoiceIcon
                    colorMode={colorMode}
                    addRipple
                    className="relative"
                  />
                </div>
                <VoiceModalities
                  responses={responses}
                  modalityComponents={defaultModalities}
                  renderedAsOverlay={true}
                  handler={mockConversationHandler}
                  showTranscript={true}
                  className={clsx(
                    "w-full",
                    "absolute inset-0 overflow-auto p-2 md:p-3 space-y-4 z-10",
                    "border-b border-solid border-primary-10",
                  )}
                />
              </div>
              <div className="flex items-center justify-center py-4 flex-none">
                <div className="w-fit relative">
                  <Ripple className="rounded-full" />
                  <IconButton
                    Icon={Mic}
                    label="Voice"
                    type={"subtle"}
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>{" "}
          </>
        }
      </Main>
    </ProviderStack>
  );
};
