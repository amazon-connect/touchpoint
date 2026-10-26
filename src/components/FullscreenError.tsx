/* eslint-disable jsdoc/require-jsdoc */
import { type FC } from "react";
import { clsx } from "clsx";

import { useIcons } from "../utils/useIcons";

export const FullscreenError: FC<unknown> = () => {
  const { Touchpoint } = useIcons();
  return (
    <div
      className={clsx(
        "grow flex flex-col items-center justify-center gap-6 text-primary",
        // Used in CSS
        "fullscreen-error",
      )}
    >
      <Touchpoint className="w-20 h-20 text-primary-20" />
      <div className="text-center">
        <h3 className="text-xl mb-2">Oops!</h3>
        <p>Something went wrong.</p>
        <p>Try again later.</p>
      </div>
    </div>
  );
};
