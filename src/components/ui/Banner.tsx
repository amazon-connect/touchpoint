import { clsx } from "clsx";
import { type FC, type ReactNode } from "react";

import { Check, Error, type IconProps, Warning } from "./Icons";

/**
 * The kinds of banner available.
 *
 * - `error`: Something went wrong.
 * - `warning`: Something needs attention.
 * - `success`: Something went well.
 * @category Modality components
 */
export type BannerType = "error" | "warning" | "success";

/**
 * Props for the Banner component
 * @inline
 * @hidden
 */
export interface BannerProps {
  /**
   * Kind of banner; sets its color and default icon.
   */
  type: BannerType;
  /**
   * Message to display
   */
  children: ReactNode;
  /**
   * Icon component to display instead of the default one for the type
   */
  Icon?: FC<IconProps>;
  /**
   * Additional CSS classes to apply to the banner
   */
  className?: string;
}

const defaultIcons: Record<BannerType, FC<IconProps>> = {
  error: Error,
  warning: Warning,
  success: Check,
};

/**
 * A pill-shaped message announcing an error, warning or success
 * @example
 * ```tsx
 * import { Banner, React } from '@amazon-connect-touchpoint/web';
 *
 * const MyBanner = () => (
 *   <Banner type="warning">Your session is about to expire.</Banner>
 * );
 * ```
 * @category Modality components
 */
export const Banner: FC<BannerProps> = ({ type, children, className }) => {
  const BannerIcon = defaultIcons[type];
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={clsx(
        "flex items-center gap-1 rounded-outer py-2 pl-2 pr-4 text-base text-primary",
        {
          "bg-error-secondary": type === "error",
          "bg-warning-secondary": type === "warning",
          "bg-success-secondary": type === "success",
        },
        className,
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center">
        <BannerIcon size={16} />
      </span>
      <div className="min-w-0 py-0">{children}</div>
    </div>
  );
};
