import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sanitizeCustomStyle } from "./customStyle";

describe("sanitizeCustomStyle", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps allowlisted properties", () => {
    expect(
      sanitizeCustomStyle({
        width: "min(420px, calc(100vw - 2rem))",
        left: "1rem",
        right: "auto",
        bottom: 24,
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        backgroundColor: "var(--color-background)",
        // Supported for the message bubbles, whose text the style wraps.
        color: "#102a43",
        zIndex: 10,
      }),
    ).toEqual({
      width: "min(420px, calc(100vw - 2rem))",
      left: "1rem",
      right: "auto",
      bottom: 24,
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      backgroundColor: "var(--color-background)",
      color: "#102a43",
      zIndex: 10,
    });
  });

  it("trims values and drops empty ones", () => {
    expect(sanitizeCustomStyle({ width: "  400px  ", height: "  " })).toEqual({
      width: "400px",
    });
  });

  it("drops properties outside the allowlist", () => {
    expect(
      sanitizeCustomStyle({
        width: "400px",
        // Would restyle Touchpoint's own content rather than the surface.
        fontFamily: "Comic Sans MS",
        content: "'x'",
        // Custom properties feed `var()` throughout the UI.
        "--color-primary": "red",
        // Not a CSS property at all.
        constructor: "nope",
      }),
    ).toEqual({ width: "400px" });
  });

  it.each([
    ["remote background images", { boxShadow: "url(https://evil.test/x.png)" }],
    ["image-set()", { backdropFilter: "image-set('https://evil.test/x.png')" }],
    ["element()", { filter: "element(#some-node)" }],
    ["legacy expression()", { width: "expression(alert(1))" }],
    ["-moz-binding", { transform: "-moz-binding: url(#x)" }],
    ["javascript: urls", { filter: "javascript:alert(1)" }],
    ["comment smuggling", { width: "400px /* } */" }],
    ["extra declarations", { width: "400px; color: red" }],
    ["rule termination", { width: "400px }" }],
    ["angle brackets", { width: "400px <script>" }],
  ])("rejects %s", (_label, style) => {
    expect(sanitizeCustomStyle(style)).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
  });

  it("rejects values that are neither strings nor finite numbers", () => {
    expect(
      sanitizeCustomStyle({
        width: Number.NaN,
        height: Number.POSITIVE_INFINITY,
        top: null,
        bottom: {},
        left: () => "1px",
        right: true,
      }),
    ).toEqual({});
  });

  it("rejects pathologically long values", () => {
    expect(sanitizeCustomStyle({ width: `${"0".repeat(501)}px` })).toEqual({});
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an array", ["width: 400px"]],
    ["a string", "width: 400px"],
    ["a number", 42],
  ])("returns an empty style for %s", (_label, style) => {
    expect(sanitizeCustomStyle(style)).toEqual({});
  });
});
