/* eslint-disable jsdoc/require-jsdoc */
import { type SetStateAction, type Dispatch, type FC } from "react";
import { clsx } from "clsx";

import { useCopy } from "../utils/useCopy";
import { IconButton, type IconButtonType } from "./ui/IconButton";
import { type ColorMode } from "../interface";
import {
  Close,
  Settings,
  Undo,
  Volume,
  VolumeOff,
  ArrowLeft,
} from "./ui/Icons";
import { HeaderContainer } from "./Layout";

interface HeaderProps {
  colorMode: ColorMode;
  errorThemedCloseButton?: boolean;
  speakerControls?: {
    enabled: boolean;
    setEnabled: Dispatch<SetStateAction<boolean>>;
  };
  renderCollapse: boolean;
  collapse: (event: Event) => void;
  reset: () => void;
  toggleSettings?: () => void;
  isSettingsOpen: boolean;
  enabled: boolean;
}

export const Header: FC<HeaderProps> = ({
  renderCollapse,
  errorThemedCloseButton,
  speakerControls,
  collapse,
  toggleSettings,
  isSettingsOpen,
  reset,
  enabled,
}) => {
  // All navigation controls live inside the panel now.
  const iconButtonType: IconButtonType = "ghost";
  const copy = useCopy();
  return (
    <HeaderContainer>
      {/* Reset lives in the top-left; when settings is open it is replaced in
          place by a back button that returns to the conversation. */}
      {isSettingsOpen && toggleSettings != null ? (
        <IconButton
          label="Back"
          type={iconButtonType}
          onClick={enabled ? toggleSettings : undefined}
          Icon={ArrowLeft}
        />
      ) : (
        <IconButton
          label={copy.restartConversationButtonLabel}
          type={iconButtonType}
          onClick={
            enabled
              ? () => {
                  reset();
                }
              : undefined
          }
          Icon={Undo}
        />
      )}
      {toggleSettings != null ? (
        <IconButton
          className="ml-auto"
          Icon={Settings}
          label="Settings"
          type={isSettingsOpen ? "activated" : iconButtonType}
          onClick={enabled ? toggleSettings : undefined}
        />
      ) : null}
      {speakerControls != null ? (
        <IconButton
          Icon={speakerControls.enabled ? Volume : VolumeOff}
          label="Speakers"
          // Neutral in both states; the icon (Volume vs VolumeOff) conveys state.
          type={iconButtonType}
          onClick={() => {
            speakerControls.setEnabled((prev) => !prev);
          }}
        />
      ) : null}
      {renderCollapse ? (
        <IconButton
          label="Collapse"
          type={(errorThemedCloseButton ?? false) ? "error" : iconButtonType}
          className={clsx(toggleSettings == null ? "ml-auto" : "")}
          onClick={
            enabled
              ? () => {
                  collapse(new Event("collapse"));
                }
              : undefined
          }
          Icon={Close}
        />
      ) : null}
    </HeaderContainer>
  );
};
