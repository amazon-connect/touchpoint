import { type ReactNode, type SVGProps } from "react";

import { type Icon, type IconProps } from "./Icons";

/**
 * The attributes every icon shares: sizing, `className`, and keeping the icon
 * out of the accessibility tree.
 * @param props - the icon props
 * @returns attributes to spread onto the `<svg>` element
 */
export const iconSvgProps = (props: IconProps): SVGProps<SVGSVGElement> => ({
  width: props.size != null ? `${props.size}px` : "100%",
  height: props.size != null ? `${props.size}px` : "100%",
  className: props.className,
  // Icons are decorative: the accessible name always comes from the
  // surrounding button or text, so keep them out of the accessibility tree.
  "aria-hidden": true,
  focusable: false,
});

/**
 * Creates an {@link Icon} from SVG content. The result honors the `size` and
 * `className` props like the built-in icons, is hidden from assistive
 * technology, and defaults to a 24x24 `viewBox` filled with `currentColor`.
 * @example
 * ```tsx
 * import { createIcon } from '@amazon-connect-touchpoint/web';
 *
 * const Close = createIcon(<path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth={2} />);
 *
 * touchpoint.update({ icons: { Close } });
 * ```
 * @param children - the SVG content, e.g. `<path d="..." />`
 * @param svgProps - overrides for the `<svg>` element, e.g. a different `viewBox` or stroke-based styling
 * @returns an icon component
 * @category Icons
 */
export const createIcon = (
  children: ReactNode,
  svgProps?: SVGProps<SVGSVGElement>,
): Icon => {
  const CustomIcon: Icon = (props) => (
    <svg viewBox="0 0 24 24" {...svgProps} {...iconSvgProps(props)}>
      {children}
    </svg>
  );
  return CustomIcon;
};
