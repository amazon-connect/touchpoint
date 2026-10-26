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
import { useIcons } from "../utils/useIcons";
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
  const { Close, Minimize, Restart, Settings, Volume, VolumeOff, Undo } =
    useIcons();
  // All navigation controls live inside the panel now.
  const iconButtonType: IconButtonType = "ghost";
  const copy = useCopy();
  const hasBrand = brandIcon != null;
  const showRestart = !hiddenElements.includes(HiddenElement.HeaderRestart);
  const showClose =
    addedElements.includes(AddedElement.HeaderClose) && collapse != null;
  const showSettings =
    toggleSettings != null &&
    !hiddenElements.includes(HiddenElement.HeaderSettings);
  const showSpeaker = speakerControls != null;
  const showCollapse = collapse != null;
  // The first right-hand control carries `ml-auto` to push the group right.
  // With a brand icon, a visible reset button leads the group instead.
  const rightControls = [
    { key: "restart", visible: hasBrand && showRestart },
    { key: "settings", visible: showSettings },
    { key: "speaker", visible: showSpeaker },
    { key: "collapse", visible: showCollapse },
    { key: "close", visible: showClose },
  ];
  const firstRight = rightControls.find((c) => c.visible)?.key;
  return (
    <HeaderContainer style={style}>
      {brandIcon != null ? (
        <BrandIcon icon={brandIcon} square={isBrandIconSquare ?? true} />
      ) : null}
      {/* Reset lives in the top-left (or, with a brand icon, leads the right-hand
          controls). */}
      {showRestart ? (
        <IconButton
          label={copy.restartConversationButtonLabel}
          className={firstRight === "restart" ? "ml-auto" : undefined}
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
      {showSettings ? (
        <IconButton
          className={firstRight === "settings" ? "ml-auto" : undefined}
          Icon={isSettingsOpen ? Undo : Settings}
          label={isSettingsOpen ? "Close settings" : "Settings"}
          type={iconButtonType}
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
