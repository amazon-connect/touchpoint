/* eslint-disable jsdoc/require-jsdoc */
import { type SetStateAction, type Dispatch, type FC } from "react";
import { clsx } from "clsx";

import { useCopy } from "../utils/useCopy";
import { IconButton, type IconButtonType } from "./ui/IconButton";
import {
  type BrandIconSource,
  type ColorMode,
  HiddenElement,
  AddedElement,
} from "../interface";
import {
  Close,
  Settings,
  Restart,
  Volume,
  VolumeOff,
  ArrowLeft,
  Minimize,
} from "./ui/Icons";
import { HeaderContainer } from "./Layout";
import { BrandIcon } from "./ui/BrandIcon";
import { type CustomStyle } from "../utils/customStyle";

interface HeaderProps {
  colorMode: ColorMode;
  isVoice: boolean;
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
  /** When undefined, no close/collapse button is rendered. */
  collapse?: (event: Event) => void;
  reset: () => void;
  toggleSettings?: () => void;
  isSettingsOpen: boolean;
  enabled: boolean;
  hiddenElements?: HiddenElement[];
  addedElements?: AddedElement[];
}

export const Header: FC<HeaderProps> = ({
  style,
  brandIcon,
  isBrandIconSquare,
  isVoice,
  speakerControls,
  collapse,
  toggleSettings,
  isSettingsOpen,
  reset,
  enabled,
  hiddenElements = [],
  addedElements = [],
}) => {
  // All navigation controls live inside the panel now.
  const iconButtonType: IconButtonType = "ghost";
  const copy = useCopy();
  const hasBrand = brandIcon != null;
  const showRestart = !hiddenElements.includes(HiddenElement.HeaderRestart);
  const showBack = isSettingsOpen && toggleSettings != null;
  const showClose =
    addedElements.includes(AddedElement.HeaderClose) && collapse != null;
  // The first right-hand control carries `ml-auto` to push the group right.
  // With a brand icon, a visible reset/back button leads the group instead.
  const firstRight: "settings" | "speaker" | "collapse" | "close" | null =
    hasBrand && (showRestart || showBack)
      ? null
      : toggleSettings != null
        ? "settings"
        : speakerControls != null
          ? "speaker"
          : collapse != null
            ? "collapse"
            : showClose
              ? "close"
              : null;
  return (
    <HeaderContainer style={style}>
      {brandIcon != null ? (
        <BrandIcon icon={brandIcon} square={isBrandIconSquare ?? true} />
      ) : null}
      {/* Reset lives in the top-left (or, with a brand icon, leads the right-hand
          controls); when settings is open it is replaced in place by a back
          button that returns to the conversation. */}
      {showBack ? (
        <IconButton
          label="Back"
          className={hasBrand ? "ml-auto" : undefined}
          type={iconButtonType}
          onClick={enabled ? toggleSettings : undefined}
          Icon={ArrowLeft}
        />
      ) : showRestart ? (
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
      ) : null}
      {toggleSettings != null ? (
        <IconButton
          className={firstRight === "settings" ? "ml-auto" : undefined}
          Icon={Settings}
          label="Settings"
          type={isSettingsOpen ? "subtle" : iconButtonType}
          onClick={enabled ? toggleSettings : undefined}
        />
      ) : null}
      {speakerControls != null ? (
        <IconButton
          className={firstRight === "speaker" ? "ml-auto" : undefined}
          Icon={speakerControls.enabled ? Volume : VolumeOff}
          label="Speakers"
          // Neutral in both states; the icon (Volume vs VolumeOff) conveys state.
          type={iconButtonType}
          onClick={() => {
            speakerControls.setEnabled((prev) => !prev);
          }}
        />
      ) : null}
      {collapse != null ? (
        <IconButton
          label={isVoice ? "Close" : "Collapse"}
          type={isVoice ? "error" : iconButtonType}
          className={clsx(firstRight === "collapse" ? "ml-auto" : "")}
          onClick={
            enabled
              ? () => {
                  collapse(new Event("collapse"));
                }
              : undefined
          }
          Icon={isVoice ? Close : Minimize}
        />
      ) : null}
      {showClose ? (
        <IconButton
          label="Close"
          type={iconButtonType}
          className={firstRight === "close" ? "ml-auto" : undefined}
          onClick={
            enabled
              ? () => {
                  collapse?.(new Event("collapse"));
                }
              : undefined
          }
          Icon={Close}
        />
      ) : null}
    </HeaderContainer>
  );
};
