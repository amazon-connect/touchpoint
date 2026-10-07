/* eslint-disable jsdoc/require-jsdoc */
import { type FC } from "react";
import { ProviderStack } from "../ProviderStack";
import { clsx } from "clsx";
import { IconButton } from "../components/ui/IconButton";
import { Close } from "../components/ui/Icons";
import { mockConversationHandler, mockTheme, responses } from "./shared";
import { type ColorMode, type Theme } from "../interface";
import { VoiceMiniControls, voiceMiniPanelClass } from "../components/Layout";
import { VoiceModalities } from "../components/VoiceModalities";
import { defaultModalities } from "../components/defaultModalities";

export const MockVoiceMini: FC<{
  colorMode?: ColorMode;
  onClose: () => void;
  /** Theme overrides layered on top of the mock's own theme. */
  theme?: Partial<Theme>;
}> = (props) => {
  const colorMode = props.colorMode ?? "dark";
  const { onClose } = props;
  const theme = { ...mockTheme, ...props.theme };

  return (
    <ProviderStack
      className={clsx("fixed bottom-2 right-2 z-touchpoint")}
      theme={theme}
      colorMode={colorMode}
      languageCode="en-US"
    >
      <VoiceMiniControls>
        <IconButton label="Close" Icon={Close} type="error" onClick={onClose} />
        <VoiceModalities
          className={clsx(
            voiceMiniPanelClass,
            "absolute right-0 -top-2 transform translate-x-0 -translate-y-full max-h-[360px] overflow-auto",
          )}
          responses={[
            ...responses,
            ...responses.map((res) => ({
              ...res,
              receivedAt: res.receivedAt + 10000000,
            })),
          ]}
          renderedAsOverlay={false}
          showTranscript={false}
          modalityComponents={defaultModalities}
          handler={mockConversationHandler}
        />
      </VoiceMiniControls>
    </ProviderStack>
  );
};
