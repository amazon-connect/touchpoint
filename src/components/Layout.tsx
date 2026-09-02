/* eslint-disable jsdoc/require-jsdoc */
import { clsx } from "clsx";
import { type FC, type ReactNode } from "react";
import { type WindowSize } from "../interface";
import { IconButton } from "./ui/IconButton";
import { Close, Reorder } from "./ui/Icons";
import { BackgroundDecoration } from "./BackgroundDecoration";
import { type DragHandleProps } from "../utils/useDraggable";

export const Main: FC<{ windowSize: WindowSize; children: ReactNode }> = ({
  windowSize,
  children,
}) => {
  return (
    <div
      className={clsx(
        "@container/main",
        // `isolate` keeps the `-z-10` decoration layered above the translucent
        // background fill but below content, without escaping this surface.
        "w-full bg-background text-primary-80 flex relative flex-col h-full backdrop-blur-overlay isolate",
        {
          "col-span-2 md:col-span-1": windowSize === "half",
          "col-span-2": windowSize === "full",
        },
      )}
    >
      <BackgroundDecoration />
      {children}
    </div>
  );
};

export const HeaderContainer: FC<{
  children: ReactNode;
}> = ({ children }) => {
  return (
    <div className="flex p-2 md:p-3 items-center justify-between gap-2 @3xl/main:absolute @3xl/main:left-0 @3xl/main:right-0 @3xl/main:top-0">
      {children}
    </div>
  );
};

export const InputContainer: FC<{
  windowSize: WindowSize;
  children: ReactNode;
}> = ({ windowSize, children }) => {
  return (
    <div
      className={clsx(
        "p-2 md:p-3 flex flex-col flex-none gap-2",
        windowSize === "full" ? "w-full md:max-w-content md:mx-auto" : "",
      )}
    >
      {children}
    </div>
  );
};

export const VoiceMiniControls: FC<{
  children: ReactNode;
  className?: string;
  /** When provided, renders a leading drag handle wired to reposition the widget. */
  dragHandleProps?: DragHandleProps;
}> = ({ children, className, dragHandleProps }) => (
  <div
    className={clsx(
      // Vertical stack on mobile (less likely to cover page content), horizontal
      // from `md` up.
      "bg-background backdrop-blur-overlay rounded-outer p-2 w-fit flex flex-col md:flex-row items-center gap-2",
      className,
    )}
  >
    {dragHandleProps != null ? (
      <span
        {...dragHandleProps}
        className="flex-none size-10 p-2.5 flex items-center justify-center text-primary-60 cursor-grab active:cursor-grabbing"
      >
        <Reorder />
      </span>
    ) : null}
    {children}
  </div>
);

export const voiceMiniPanelClass =
  "bg-background backdrop-blur-overlay text-primary-80 rounded-outer p-2 w-[calc(100vw-16px)] max-w-[360px] space-y-4";

export const VoiceMiniPanel: FC<{
  children: ReactNode;
  onClose?: () => void;
}> = ({ children, onClose }) => (
  <div className={voiceMiniPanelClass}>
    {onClose != null && (
      <div className="flex items-center justify-end">
        <IconButton onClick={onClose} Icon={Close} type="ghost" label="Close" />
      </div>
    )}
    {children}
  </div>
);
