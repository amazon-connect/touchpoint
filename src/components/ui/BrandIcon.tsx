/* eslint-disable jsdoc/require-jsdoc */
import clsx from "clsx";
import { createElement, type FC } from "react";

import { type BrandIconSource } from "../../interface";

export const BrandIcon: FC<{
  icon: BrandIconSource;
  /**
   * Whether the icon is held to a 40px square. When `false` it is 40px tall and
   * as wide as its content, to fit text or a wordmark.
   */
  square: boolean;
  className?: string;
}> = ({ icon, square, className }) => {
  if (typeof icon === "string") {
    return (
      <img
        className={clsx(
          square ? "size-10" : "h-10 w-auto",
          "block flex-none object-contain object-center",
          className,
        )}
        src={icon}
        alt=""
        role="presentation"
      />
    );
  }
  return (
    <span
      className={clsx(
        square ? "size-10" : "h-10 min-w-10",
        "inline-block flex-none",
        className,
      )}
    >
      {createElement(icon, { square })}
    </span>
  );
};
