import { type CSSProperties } from "react";

/**
 * CSS properties that may be set through `TouchpointConfiguration.containerStyle`.
 *
 * Touchpoint renders inside a closed shadow root, so page-level CSS cannot
 * reach the container and class names defined outside are meaningless. This
 * allowlist is the supported escape hatch: it covers the geometry and surface
 * of the container itself, and deliberately excludes anything that could load
 * a remote resource, define a custom property consumed by `var()` elsewhere in
 * the UI, or restyle Touchpoint's own content.
 */
const allowedProperties = [
  // Placement and stacking.
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "insetBlock",
  "insetBlockStart",
  "insetBlockEnd",
  "insetInline",
  "insetInlineStart",
  "insetInlineEnd",
  "zIndex",

  // Size.
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
  "blockSize",
  "minBlockSize",
  "maxBlockSize",
  "inlineSize",
  "minInlineSize",
  "maxInlineSize",
  "aspectRatio",

  // Spacing.
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginBlock",
  "marginBlockStart",
  "marginBlockEnd",
  "marginInline",
  "marginInlineStart",
  "marginInlineEnd",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "paddingBlock",
  "paddingBlockStart",
  "paddingBlockEnd",
  "paddingInline",
  "paddingInlineStart",
  "paddingInlineEnd",

  // Surface.
  "backgroundColor",
  "opacity",
  "backdropFilter",
  "boxShadow",
  "filter",
  "border",
  "borderColor",
  "borderStyle",
  "borderWidth",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "outline",
  "outlineOffset",

  // Layout of the container itself within its parent, and overflow behavior.
  "overflow",
  "overflowX",
  "overflowY",
  "flex",
  "flexBasis",
  "flexGrow",
  "flexShrink",
  "alignSelf",
  "justifySelf",
  "gridArea",
  "gridColumn",
  "gridRow",
  "order",

  // Transforms and transitions, for custom entrance placement/animation.
  "transform",
  "transformOrigin",
  "transition",
  "willChange",
] as const satisfies ReadonlyArray<keyof CSSProperties>;

const allowedPropertySet = new Set<string>(allowedProperties);

/**
 * Style overrides applied to the full conversation container — the expanded chat
 * or full-screen voice experience, not the launch icon or the `voiceMini` widget.
 *
 * Only the properties in this type are supported; see
 * `TouchpointConfiguration.containerStyle`.
 * @category Theming
 */
export type ContainerStyle = Pick<
  CSSProperties,
  (typeof allowedProperties)[number]
>;

/**
 * Value substrings that are rejected outright.
 *
 * React assigns each declaration individually through the CSSOM, so a value
 * cannot break out into a new declaration or rule the way it can with
 * concatenated stylesheet text — the browser simply discards an invalid value.
 * These patterns are about what a *valid* value can still do: fetch a remote
 * resource (leaking the visitor's IP, `Referer` and a render-time ping to a
 * third party), or reach legacy script-execution sinks in old engines.
 */
const forbiddenValuePatterns: Array<[RegExp, string]> = [
  [/url\s*\(/i, "url()"],
  [/image-set\s*\(/i, "image-set()"],
  [/\belement\s*\(/i, "element()"],
  [/expression\s*\(/i, "expression()"],
  [/-moz-binding/i, "-moz-binding"],
  [/\bbehaviou?r\s*:/i, "behavior"],
  [/javascript\s*:/i, "javascript:"],
  // Comment syntax has no legitimate use in a single declaration value and is
  // a common way to smuggle the patterns above past a naive filter.
  [/\/\*|\*\//, "CSS comments"],
  // A raw `;` or `}` means the caller is trying to write more than one
  // declaration; the browser would drop the value anyway.
  [/[;}{]/, "; { }"],
  [/[<>]/, "< >"],
];

/** Upper bound on a single declaration value, to keep pathological input out. */
const maxValueLength = 500;

const warn = (message: string): void => {
  // eslint-disable-next-line no-console
  console.warn(`[touchpoint] containerStyle: ${message}`);
};

/**
 * Validates caller-provided container styles before they reach the DOM.
 *
 * `containerStyle` can arrive from places that are not the application's own
 * source code — notably the `configuration` attribute of the
 * `<connect-touchpoint>` element, which may be rendered by a server or a
 * no-code tool — so it is treated as untrusted input rather than trusted
 * developer code: unknown properties and suspicious values are dropped with a
 * warning instead of being passed through.
 * @param style - the caller-provided style object, of unknown shape at runtime
 * @returns a style object containing only allowlisted properties with plain values
 */
export const sanitizeContainerStyle = (style: unknown): ContainerStyle => {
  if (style == null) {
    return {};
  }
  if (typeof style !== "object" || Array.isArray(style)) {
    warn("expected a plain object of CSS properties, ignoring.");
    return {};
  }
  const sanitized: Record<string, string | number> = {};
  for (const [property, value] of Object.entries(style)) {
    if (!allowedPropertySet.has(property)) {
      warn(`\`${property}\` is not a supported property, ignoring it.`);
      continue;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        warn(`\`${property}\` must be a finite number, ignoring it.`);
        continue;
      }
      sanitized[property] = value;
      continue;
    }
    if (typeof value !== "string") {
      warn(`\`${property}\` must be a string or a number, ignoring it.`);
      continue;
    }
    const trimmed = value.trim();
    if (trimmed === "") {
      continue;
    }
    if (trimmed.length > maxValueLength) {
      warn(
        `the value of \`${property}\` exceeds ${maxValueLength} characters, ignoring it.`,
      );
      continue;
    }
    const forbidden = forbiddenValuePatterns.find(([pattern]) =>
      pattern.test(trimmed),
    );
    if (forbidden != null) {
      warn(`the value of \`${property}\` may not contain ${forbidden[1]}.`);
      continue;
    }
    sanitized[property] = trimmed;
  }
  return sanitized;
};
