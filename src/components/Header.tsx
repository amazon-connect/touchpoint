/* eslint-disable jsdoc/require-jsdoc */
import { type SetStateAction, type Dispatch, type FC } from "react";
import { clsx } from "clsx";

import { useCopy } from "../utils/useCopy";
import { IconButton, type IconButtonType } from "./ui/IconButton";
import { type BrandIconSource, type ColorMode } from "../interface";
import {
  Close,
  Settings,
  Restart,
  Volume,
  VolumeOff,
  ArrowLeft,
} from "./ui/Icons";
import { HeaderContainer } from "./Layout";
import { BrandIcon } from "./ui/BrandIcon";
import { type CustomStyle } from "../utils/customStyle";

interface HeaderProps {
  colorMode: ColorMode;
  errorThemedCloseButton?: boolean;
  style?: CustomStyle;
  /**
   * Brand shown on the left (floating mode only). When present, the reset
   * button moves to the right, next to the other controls.
   */
  brandIcon?: BrandIconSource;
  isBrandIconSquare?: boolean;
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
  style,
  brandIcon,
  isBrandIconSquare,
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
  const hasBrand = brandIcon != null;
  return (
    <HeaderContainer style={style}>
      {brandIcon != null ? (
        <BrandIcon icon={brandIcon} square={isBrandIconSquare ?? true} />
      ) : null}
      {/* Reset lives in the top-left (or, with a brand icon, leads the right-hand
          controls); when settings is open it is replaced in place by a back
          button that returns to the conversation. */}
      {isSettingsOpen && toggleSettings != null ? (
        <IconButton
          label="Back"
          className={hasBrand ? "ml-auto" : undefined}
          type={iconButtonType}
          onClick={enabled ? toggleSettings : undefined}
          Icon={ArrowLeft}
        />
      ) : (
        <IconButton
          label={copy.restartConversationButtonLabel}
          className={hasBrand ? "ml-auto" : undefined}
          type={iconButtonType}
          onClick={
            enabled
              ? () => {
                  reset();
                }
              : undefined
          }
          Icon={Restart}
        />
      )}
      {toggleSettings != null ? (
        <IconButton
          className={hasBrand ? undefined : "ml-auto"}
          Icon={Settings}
          label="Settings"
          type={isSettingsOpen ? "subtle" : iconButtonType}
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
          className={clsx(toggleSettings == null && !hasBrand ? "ml-auto" : "")}
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
