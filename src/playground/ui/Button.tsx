import clsx from "clsx";
import { type ButtonHTMLAttributes, type FC } from "react";

/** Visual weight of a {@link Button}. */
type ButtonVariant = "primary" | "secondary";

const variants: Record<ButtonVariant, string> = {
  primary: "px-7 py-3 text-[15px] font-bold",
  secondary: "px-[22px] py-2.5 text-sm font-semibold",
};

/**
 * Filled pill button. `primary` is the page's main call to action (Launch
 * playground); `secondary` is the same treatment at a smaller size, used for the
 * in-guide actions.
 */
export const Button: FC<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Visual weight; defaults to `secondary`. */
    variant?: ButtonVariant;
  }
> = ({ variant = "secondary", className, ...props }) => (
  <button
    type="button"
    {...props}
    className={clsx(
      "rounded-full bg-cta text-cta-fg transition-colors hover:bg-cta-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      variants[variant],
      className,
    )}
  />
);
