import clsx from "clsx";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { Carousel } from "../../components/ui/Carousel";
import {
  CustomCard,
  CustomCardImageRow,
  CustomCardRow,
} from "../../components/ui/CustomCard";
import { DateInput } from "../../components/ui/DateInput";
import {
  IconButton,
  type IconButtonType,
} from "../../components/ui/IconButton";
import * as Icons from "../../components/ui/Icons";
import { type ColorMode, type MessageStatus } from "../../interface";
import { BackgroundDecoration } from "../../components/BackgroundDecoration";
import { Messages } from "../../components/Messages";
import { defaultModalities } from "../../components/defaultModalities";
import { mockConversationHandler, responses } from "../../mocks/shared";
import {
  type BubbleStyle,
  DEFAULT_BUBBLE_STYLE,
  hasTranscriptEdits,
  restoreTranscriptDefaults,
  type Settings,
  settingsStore,
  type Toggle,
  useSettings,
} from "../settings";
import { LaunchButton } from "../../components/ui/LaunchButton";
import { Loader } from "../../components/ui/Loader";
import {
  MessageButton,
  type MessageButtonType,
} from "../../components/ui/MessageButton";
import { MessageStatusRow } from "../../components/ui/MessageStatusRow";
import { TextButton, TextButtonGroup } from "../../components/ui/TextButton";
import { BaseText, SmallText } from "../../components/ui/Typography";
import { defaultTheme } from "../../components/Theme";
import {
  customThemeStore,
  EDITABLE_COLOR_KEYS,
  EDITABLE_GENERAL_KEYS,
  type EditableColorKey,
  type EditableGeneralKey,
  isEditableColorKey,
  useCustomTheme,
} from "../customTheme";
import { buildThemeSnippet, buildTranscriptSnippet } from "../snippets";
import { CodeBlock } from "../ui/CodeBlock";
import { Segmented, type SegmentedOption } from "../ui/Segmented";
import {
  type MockScreen,
  type MockWindowSize,
  mockPreviewStore,
  useMockPreview,
} from "./mockPreview";

/*
  Everything in this file renders inside the library's shadow root (see
  LibrarySurface), so the classes here are the library's Tailwind theme —
  `text-primary-60`, `rounded-inner` and friends — not the playground palette.

  Library components treat a missing handler as the disabled state, so each
  specimen shows a pair: one with a handler, one without.
*/

const noop = (): void => {};

/** A labelled row of variants. */
const Row: FC<{
  /** What distinguishes this row from the others. */
  label: string;
  /** Lay the variants out in two equal columns (for full-width components). */
  columns?: boolean;
  /** The variants. */
  children: ReactNode;
}> = ({ label, columns = false, children }) => (
  <div className="space-y-2">
    <SmallText>{label}</SmallText>
    <div
      className={clsx(
        columns
          ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
          : "flex flex-wrap items-center gap-3",
      )}
    >
      {children}
    </div>
  </div>
);

/** Placeholder card artwork — inline so the page needs no network. */
const CARD_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="208">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#E860FF"/>
       <stop offset="0.5" stop-color="#FF6200"/>
       <stop offset="1" stop-color="#00ABBA"/>
     </linearGradient></defs>
     <rect width="320" height="208" fill="url(#g)"/>
   </svg>`,
)}`;

const TextButtons: FC = () => (
  <>
    <Row label="type: main" columns>
      <TextButton
        type="main"
        onClick={noop}
        label="Main default"
        Icon={Icons.ArrowForward}
      />
      <TextButton type="main" label="Main disabled" Icon={Icons.ArrowForward} />
    </Row>
    <Row label="type: ghost (default)" columns>
      <TextButton
        type="ghost"
        onClick={noop}
        label="Ghost default"
        Icon={Icons.ArrowForward}
      />
      <TextButton
        type="ghost"
        label="Ghost disabled"
        Icon={Icons.ArrowForward}
      />
    </Row>
    <Row label="type: error" columns>
      <TextButton
        type="error"
        onClick={noop}
        label="Error default"
        Icon={Icons.Close}
      />
      <TextButton type="error" label="Error disabled" Icon={Icons.Close} />
    </Row>
  </>
);

/*
  `grouped` text buttons round their own first/last corners via `first:`/
  `last:`, so they are only shown inside a `TextButtonGroup`.
*/
const TextButtonGroups: FC = () => (
  <>
    <Row label="three options" columns>
      <TextButtonGroup>
        <TextButton
          type="grouped"
          onClick={noop}
          label="Check order status"
          Icon={Icons.ArrowForward}
        />
        <TextButton
          type="grouped"
          onClick={noop}
          label="Change delivery date"
          Icon={Icons.ArrowForward}
        />
        <TextButton
          type="grouped"
          onClick={noop}
          label="Something else"
          Icon={Icons.ArrowForward}
        />
      </TextButtonGroup>
    </Row>
    <Row label="one option disabled" columns>
      <TextButtonGroup>
        <TextButton
          type="grouped"
          onClick={noop}
          label="Grouped default"
          Icon={Icons.ArrowForward}
        />
        <TextButton
          type="grouped"
          label="Grouped disabled"
          Icon={Icons.ArrowForward}
        />
      </TextButtonGroup>
    </Row>
  </>
);

const ICON_BUTTON_TYPES: IconButtonType[] = [
  "main",
  "ghost",
  "subtle",
  "coverup",
  "error",
];

const IconButtons: FC = () => (
  <>
    {ICON_BUTTON_TYPES.map((type) => (
      <Row key={type} label={`type: ${type}`}>
        <IconButton
          type={type}
          onClick={noop}
          label={`${type} default`}
          Icon={Icons.Close}
        />
        <IconButton type={type} label={`${type} disabled`} Icon={Icons.Close} />
      </Row>
    ))}
  </>
);

const MESSAGE_BUTTON_TYPES: MessageButtonType[] = [
  "default",
  "selected",
  "unselected",
];

const MessageButtons: FC = () => (
  <>
    {MESSAGE_BUTTON_TYPES.map((type) => (
      <Row key={type} label={`type: ${type}`}>
        <MessageButton
          type={type}
          onClick={noop}
          label={`${type} default`}
          Icon={Icons.ThumbUp}
        />
        <MessageButton
          type={type}
          label={`${type} disabled`}
          Icon={Icons.ThumbUp}
        />
      </Row>
    ))}
  </>
);

const MESSAGE_STATUSES: MessageStatus[] = [
  "sending",
  "sent",
  "delivered",
  "read",
  "failed",
];

const MessageStatusRows: FC = () => (
  <Row label="all statuses">
    {MESSAGE_STATUSES.map((status) => (
      <MessageStatusRow key={status} status={status} />
    ))}
  </Row>
);

const LaunchButtons: FC = () => (
  <>
    <Row label="icon only">
      <LaunchButton label="Open Touchpoint" onClick={noop} />
      <LaunchButton label="Open Touchpoint" />
    </Row>
    <Row label="with label">
      <LaunchButton label="Open Touchpoint" showLabel onClick={noop} />
    </Row>
  </>
);

const Typography: FC = () => (
  <>
    <Row label="BaseText">
      <BaseText>The quick brown fox jumps over the lazy dog.</BaseText>
    </Row>
    <Row label="BaseText faded">
      <BaseText faded>The quick brown fox jumps over the lazy dog.</BaseText>
    </Row>
    <Row label="SmallText">
      <SmallText>The quick brown fox jumps over the lazy dog.</SmallText>
    </Row>
  </>
);

const Cards: FC = () => {
  const [selected, setSelected] = useState("outbound");
  return (
    <>
      <Row label="rows, with and without an icon">
        <CustomCard>
          <CustomCardRow
            left={<BaseText faded>Departure</BaseText>}
            right={
              <>
                <BaseText>8:15 AM</BaseText>
                <SmallText>Nonstop</SmallText>
              </>
            }
            icon={Icons.ArrowForward}
          />
          <CustomCardRow
            left={<BaseText>Blue Airlines 101</BaseText>}
            right={<BaseText>$312</BaseText>}
          />
        </CustomCard>
      </Row>
      <Row label="image row">
        <CustomCard>
          <CustomCardImageRow src={CARD_IMAGE} alt="" />
          <CustomCardRow
            left={<BaseText>Seattle</BaseText>}
            right={<BaseText faded>2 nights</BaseText>}
          />
        </CustomCard>
      </Row>
      <Row label="selectable (click to select)">
        {["outbound", "return"].map((id) => (
          <CustomCard
            key={id}
            selected={selected === id}
            onClick={() => {
              setSelected(id);
            }}
          >
            <CustomCardRow
              left={
                <BaseText>{id === "outbound" ? "Outbound" : "Return"}</BaseText>
              }
              right={
                <BaseText faded>
                  {selected === id ? "Selected" : "Choose"}
                </BaseText>
              }
            />
          </CustomCard>
        ))}
      </Row>
      <Row label="link (href)">
        <CustomCard href="https://aws.amazon.com/connect/" newTab>
          <CustomCardRow
            left={<BaseText>Amazon Connect</BaseText>}
            right={<SmallText>Opens in a new tab</SmallText>}
            icon={Icons.OpenInNew}
          />
        </CustomCard>
      </Row>
    </>
  );
};

const Carousels: FC = () => (
  <Row label="drag or scroll horizontally">
    <Carousel>
      {["Seattle", "Portland", "Vancouver", "San Diego", "Austin"].map(
        (city) => (
          <CustomCard key={city} onClick={noop}>
            <CustomCardImageRow src={CARD_IMAGE} alt="" />
            <CustomCardRow
              left={<BaseText>{city}</BaseText>}
              right={<BaseText faded>from $189</BaseText>}
            />
          </CustomCard>
        ),
      )}
    </Carousel>
  </Row>
);

const DateInputs: FC = () => {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <>
      <Row label="default">
        <div className="w-full max-w-content">
          <DateInput onSubmit={setSubmitted} />
        </div>
      </Row>
      <Row label="submitted value">
        <BaseText faded>{submitted ?? "Nothing submitted yet"}</BaseText>
      </Row>
      <Row label="disabled (no onSubmit)">
        <div className="w-full max-w-content">
          <DateInput />
        </div>
      </Row>
    </>
  );
};

const Loaders: FC = () => (
  <>
    <Row label="with a label">
      <div className="h-32 w-full">
        <Loader label="Thinking" />
      </div>
    </Row>
    <Row label="bare">
      <div className="h-32 w-full">
        <Loader />
      </div>
    </Row>
  </>
);

const IconGrid: FC = () => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
    {Object.entries(Icons).map(([name, Icon]) => (
      <div
        key={name}
        className="flex flex-col items-center gap-2 rounded-inner bg-primary-5 p-3 text-center"
      >
        <Icon size={24} className="text-primary-80" />
        <span className="text-xs break-all text-primary-60">{name}</span>
      </div>
    ))}
  </div>
);

/**
 * One swatch: the `Theme` key you set, and the background utility it drives.
 * The class names are spelled out rather than built from the key, because
 * Tailwind only emits a utility it can find as a literal in the source.
 */
interface Swatch {
  name: string;
  className: string;
}

/**
 * A column of swatches in the single colors table. The primary and secondary
 * columns sit side by side, so each primary step lines up with the secondary
 * step at the same alpha — they're mirror images, and the pairing shows that.
 */
interface ColorGroup {
  label: string;
  colors: Swatch[];
}

const COLOR_COLUMNS: ColorGroup[] = [
  {
    label: "Primary",
    colors: [
      { name: "primary", className: "bg-primary" },
      { name: "primary90", className: "bg-primary-90" },
      { name: "primary80", className: "bg-primary-80" },
      { name: "primary60", className: "bg-primary-60" },
      { name: "primary40", className: "bg-primary-40" },
      { name: "primary20", className: "bg-primary-20" },
      { name: "primary10", className: "bg-primary-10" },
      { name: "primary5", className: "bg-primary-5" },
      { name: "primary1", className: "bg-primary-1" },
    ],
  },
  {
    label: "Secondary",
    colors: [
      { name: "secondary", className: "bg-secondary" },
      { name: "secondary90", className: "bg-secondary-90" },
      { name: "secondary80", className: "bg-secondary-80" },
      { name: "secondary60", className: "bg-secondary-60" },
      { name: "secondary40", className: "bg-secondary-40" },
      { name: "secondary20", className: "bg-secondary-20" },
      { name: "secondary10", className: "bg-secondary-10" },
      { name: "secondary5", className: "bg-secondary-5" },
      { name: "secondary1", className: "bg-secondary-1" },
    ],
  },
  {
    label: "Status",
    colors: [
      { name: "warningPrimary", className: "bg-warning-primary" },
      { name: "warningSecondary", className: "bg-warning-secondary" },
      { name: "errorPrimary", className: "bg-error-primary" },
      { name: "errorSecondary", className: "bg-error-secondary" },
      { name: "successPrimary", className: "bg-success-primary" },
      { name: "successSecondary", className: "bg-success-secondary" },
      { name: "focus", className: "bg-focus" },
    ],
  },
  {
    label: "Miscellaneous",
    colors: [
      { name: "accent", className: "bg-accent" },
      { name: "accent50", className: "bg-accent-50" },
      { name: "accent20", className: "bg-accent-20" },
      { name: "background", className: "bg-background" },
      { name: "overlay", className: "bg-overlay" },
    ],
  },
];

const ColorSwatch: FC<Swatch> = ({ name, className }) => (
  <div className="flex flex-col items-center gap-2 text-center">
    {/* Bordered so the faintest steps still read as a rectangle. */}
    <div
      className={clsx(
        "h-10 w-full rounded-[8px] border border-solid border-primary-20",
        className,
      )}
    />
    <span className="text-xs break-all text-primary-60">{name}</span>
  </div>
);

/*
  The editor UI below — the color popup, the transcript controls — renders in
  the shadow root alongside the specimens, so it is styled with the library's
  own theme tokens (`text-primary-60`, `bg-background`, `rounded-inner`, …).
  That keeps it tracking light/dark and the edited palette automatically, and
  makes the editors look like the components they configure.
*/

/** A subtle text button used inside the color editor and its header. */
const EditorButton: FC<{
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}> = ({ onClick, disabled = false, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      "inline-flex items-center gap-1 whitespace-nowrap border-none bg-transparent p-0 text-xs",
      disabled
        ? "cursor-default text-primary-40"
        : "cursor-pointer text-primary-80",
    )}
  >
    {children}
  </button>
);

/** Matches a `#rgb`/`#rrggbb` color the native picker can display. */
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Popup with a native color picker and a CSS-color input for one color value.
 *
 * Opening it focuses (and selects) the text input, so a value can be typed or
 * pasted straight away; `Escape` or a click outside closes it. Both the Colors
 * gallery and the transcript example's bubble colors use it, so editing a color
 * feels the same everywhere.
 */
const ColorPopup: FC<{
  /** Accessible name of the color being edited, e.g. `accent`. */
  name: string;
  /** Current CSS color, or `""` when nothing is set. */
  value: string;
  /** Hex seed for the native picker when `value` is not a hex color. */
  pickerFallback: string;
  /** Applies a new CSS color. */
  onChange: (value: string) => void;
  /** Clears the customization; omitted when there is nothing to clear. */
  onReset?: () => void;
  /** Closes the popup. */
  onClose: () => void;
}> = ({ name, value, pickerFallback, onChange, onReset, onClose }) => {
  const input = useRef<HTMLInputElement>(null);

  // The text field is the one that takes any CSS color, so it gets the focus.
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // The native picker only understands hex; when the CSS color isn't one (e.g.
  // `rebeccapurple`, `rgb(...)`, `light-dark(...)`) it falls back to the seed
  // so it stays usable.
  const pickerValue = HEX_RE.test(value.trim()) ? value.trim() : pickerFallback;

  return (
    <>
      {/* Click-away backdrop; covers the viewport so a click anywhere closes. */}
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-40" />
      <div
        role="dialog"
        aria-label={`Edit ${name} color`}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="absolute top-[calc(100%+8px)] left-1/2 z-50 flex w-52 -translate-x-1/2 flex-col gap-2.5 rounded-inner border border-solid border-primary-20 bg-background p-3 backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
      >
        <input
          type="color"
          value={pickerValue}
          aria-label={`${name} color picker`}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="h-9 w-full cursor-pointer border-none bg-transparent p-0"
        />
        <input
          ref={input}
          type="text"
          value={value}
          spellCheck={false}
          aria-label={`${name} CSS color`}
          placeholder="e.g. #1c63da or rgb(28 99 218)"
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="w-full rounded-[6px] border border-solid border-primary-20 bg-transparent px-2 py-1.5 font-mono text-xs text-primary focus:border-accent focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <EditorButton
            disabled={onReset == null}
            onClick={() => {
              onReset?.();
            }}
          >
            <Icons.Refresh size={12} className="text-primary-60" />
            Reset
          </EditorButton>
          <EditorButton onClick={onClose}>Done</EditorButton>
        </div>
      </div>
    </>
  );
};

/**
 * The button that opens a {@link ColorPopup}: a swatch of the current color,
 * flagged as editable and, when it differs from the default, as edited.
 */
const ColorSwatchButton: FC<{
  /** Accessible name of the color, e.g. `accent`. */
  name: string;
  /** Background utility for theme swatches, whose color comes from a token. */
  className?: string;
  /** Explicit CSS color, for swatches backed by a value rather than a token. */
  color?: string;
  /** Whether its popup is open. */
  isOpen: boolean;
  /** Whether the color differs from its default. */
  isEdited: boolean;
  /** Opens or closes the popup. */
  onToggle: () => void;
  /** `swatch` fills its column (the gallery); `chip` sits inline in a row. */
  size: "swatch" | "chip";
}> = ({ name, className, color, isOpen, isEdited, onToggle, size }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={`Edit ${name} color`}
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    // A conic checkerboard shows through where no color is set, so "inherit"
    // is distinguishable from an opaque swatch.
    style={
      color != null
        ? {
            background:
              color === ""
                ? "repeating-conic-gradient(var(--color-primary-20) 0% 25%, transparent 0% 50%) 0 0 / 8px 8px"
                : color,
          }
        : undefined
    }
    className={clsx(
      "relative cursor-pointer rounded-[8px] border border-solid border-primary-20",
      isOpen && "outline-2 outline-offset-2 outline-accent",
      size === "swatch" ? "h-10 w-full" : "size-7 shrink-0",
      className,
    )}
  >
    {size === "swatch" && (
      <>
        {/* Edit affordance: a chip in the corner marks the swatch as clickable. */}
        <span className="absolute top-0.5 right-0.5 grid size-[18px] place-items-center rounded-full bg-background">
          <Icons.Edit size={12} className="text-primary-60" />
        </span>
        {isEdited && (
          // Filled dot: this color has been changed from its default.
          <span
            aria-hidden
            className="absolute top-0.5 left-0.5 size-2 rounded-full bg-accent"
          />
        )}
      </>
    )}
  </button>
);

/** A gallery swatch that opens {@link ColorPopup} for a theme color. */
const EditableColorSwatch: FC<{
  colorKey: EditableColorKey;
  className: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}> = ({ colorKey, className, isOpen, onToggle, onClose }) => {
  const overrides = useCustomTheme();
  const isEdited = colorKey in overrides;
  return (
    <div className="relative flex flex-col items-center gap-2 text-center">
      <ColorSwatchButton
        name={colorKey}
        className={className}
        size="swatch"
        isOpen={isOpen}
        isEdited={isEdited}
        onToggle={onToggle}
      />
      <span className="text-xs break-all text-primary-60">
        {colorKey}
        {isEdited ? " (edited)" : ""}
      </span>
      {isOpen && (
        <ColorPopup
          name={colorKey}
          value={overrides[colorKey] ?? defaultTheme[colorKey]}
          pickerFallback={defaultTheme[colorKey]}
          onChange={(value) => {
            customThemeStore.setField(colorKey, value);
          }}
          onReset={
            isEdited
              ? () => {
                  customThemeStore.resetField(colorKey);
                }
              : undefined
          }
          onClose={onClose}
        />
      )}
    </div>
  );
};

const ColorGrid: FC = () => {
  const overrides = useCustomTheme();
  const [openKey, setOpenKey] = useState<EditableColorKey | null>(null);
  // Only the colors: the General entry resets its own fields.
  const hasEdits = EDITABLE_COLOR_KEYS.some((key) => key in overrides);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <SmallText>
          Click accent, background, primary or secondary to edit. Opacity
          variants derive automatically.
        </SmallText>
        {hasEdits && (
          <EditorButton
            onClick={() => {
              customThemeStore.restoreDefaults(EDITABLE_COLOR_KEYS);
              setOpenKey(null);
            }}
          >
            <Icons.Refresh size={12} className="text-primary-60" />
            Restore defaults
          </EditorButton>
        )}
      </div>
      {/* One table: fixed 160px columns — wide enough for the headings to stay
          on one line — so every swatch is the same width and the primary and
          secondary steps line up row by row. */}
      <div className="grid grid-cols-[repeat(4,160px)] items-start gap-x-8">
        {COLOR_COLUMNS.map((group) => (
          <div key={group.label} className="space-y-2">
            <SmallText className="whitespace-nowrap">{group.label}</SmallText>
            <div className="flex flex-col gap-4">
              {group.colors.map((color) => {
                const key = color.name;
                if (!isEditableColorKey(key)) {
                  return <ColorSwatch key={key} {...color} />;
                }
                return (
                  <EditableColorSwatch
                    key={key}
                    colorKey={key}
                    className={color.className}
                    isOpen={openKey === key}
                    onToggle={() => {
                      setOpenKey((prev) => (prev === key ? null : key));
                    }}
                    onClose={() => {
                      setOpenKey(null);
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/** A labelled card grouping related transcript controls. */
const ControlGroup: FC<{
  /** What the controls inside configure. */
  title: string;
  /** The controls. */
  children: ReactNode;
}> = ({ title, children }) => (
  <section className="space-y-2.5 rounded-inner border border-solid border-primary-10 bg-primary-1 p-3">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-60">
      {title}
    </h3>
    {children}
  </section>
);

/**
 * Controls that depend on a switch being on, indented and ruled so they read
 * as belonging to the switch above them.
 */
const ControlGroupNested: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="ml-1 space-y-2.5 border-l border-solid border-primary-10 pl-3">
    {children}
  </div>
);

/** A switch toggling one of the transcript's on/off customizations. */
const Switch: FC<{
  /** What the switch turns on, e.g. `User message bubble`. */
  label: string;
  /** Current state. */
  value: Toggle;
  /** Called with the new state. */
  onChange: (value: Toggle) => void;
}> = ({ label, value, onChange }) => {
  const isOn = value === "on";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={() => {
        onChange(isOn ? "off" : "on");
      }}
      className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-[6px] border-none bg-transparent p-0 text-left focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span className="text-sm text-primary-80 transition-colors group-hover:text-primary">
        {label}
      </span>
      <span
        aria-hidden
        className={clsx(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          isOn
            ? "bg-accent group-hover:bg-accent-50"
            : "bg-primary-20 group-hover:bg-primary-40",
        )}
      >
        {/* The knob reads against either track: the surface color is the
            lightest token in light mode and the darkest in dark mode. */}
        <span
          className={clsx(
            "absolute top-[3px] size-3.5 rounded-full bg-background shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-all",
            isOn ? "left-[19px]" : "left-[3px]",
          )}
        />
      </span>
    </button>
  );
};

const MOCK_SCREEN_OPTIONS: SegmentedOption<MockScreen>[] = [
  { value: "text", label: "Text" },
  { value: "voice", label: "Voice" },
  { value: "voiceMini", label: "Voice mini" },
];

const MOCK_WINDOW_SIZE_OPTIONS: SegmentedOption<MockWindowSize>[] = [
  { value: "half", label: "Half" },
  { value: "full", label: "Full" },
  { value: "floating", label: "Floating" },
];

/** A labelled block of mock screen controls. */
const MockControl: FC<{
  /** What the control configures. */
  label: string;
  /** The control. */
  children: ReactNode;
}> = ({ label, children }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
      {label}
    </p>
    {children}
  </div>
);

/*
  The mock screens example configures the widget shell preview — which
  experience, how it is presented — and launches it. The mock itself renders in
  its own root over the whole page (see `MockHost`), so the choices live in
  `mockPreviewStore` rather than local state.

  Unlike every other entry, this one is page chrome rather than a gallery: it
  renders in the playground's own DOM (`surface: "page"`), so its toggles are
  the playground's `Segmented` — the one toggle style the page uses. Only the
  launch button is a library component, so it gets a `LibrarySurface` of its
  own.
*/
const MockScreens: FC<SpecimenProps> = () => {
  const preview = useMockPreview();
  return (
    <div className="max-w-[420px] space-y-5">
      <MockControl label="Experience">
        <Segmented
          label="Experience"
          value={preview.screen}
          options={MOCK_SCREEN_OPTIONS}
          onChange={(screen) => {
            mockPreviewStore.patch({ screen });
          }}
        />
      </MockControl>
      {/* Voice mini is its own compact widget; it ignores the presentation. */}
      {preview.screen !== "voiceMini" && (
        <MockControl label="Presentation">
          <Segmented
            label="Presentation"
            value={preview.windowSize}
            options={MOCK_WINDOW_SIZE_OPTIONS}
            onChange={(windowSize) => {
              mockPreviewStore.patch({ windowSize });
            }}
          />
        </MockControl>
      )}
      <div className="space-y-1">
        <LaunchButton
          label="Launch mock screen"
          showLabel
          onClick={() => {
            mockPreviewStore.patch({ isOpen: true });
          }}
        />
        <p className="text-xs text-muted">
          Press Escape or the close button to dismiss the mock.
        </p>
      </div>
    </div>
  );
};

/** A labelled text field, for the free-text transcript customizations. */
const TextControl: FC<{
  /** What the field sets. */
  label: string;
  /** Current value. */
  value: string;
  /** Shown when the value is empty. */
  placeholder?: string;
  /** Called with the new value. */
  onChange: (value: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
  <label className="flex items-center justify-between gap-3">
    <span className="text-sm text-primary-60">{label}</span>
    <input
      type="text"
      value={value}
      spellCheck={false}
      placeholder={placeholder}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      className="min-w-0 flex-1 rounded-[6px] border border-solid border-primary-20 bg-transparent px-2 py-1.5 font-mono text-xs text-primary placeholder:text-primary-40 focus:border-accent focus:outline-none"
    />
  </label>
);

/** A labelled color field: the same swatch and popup as the Colors gallery. */
const ColorControl: FC<{
  /** What the color applies to, e.g. `Background`. */
  label: string;
  /** Current CSS color, or `""` when the theme's own color shows through. */
  value: string;
  /** Whether this field's popup is open. */
  isOpen: boolean;
  /** Opens or closes this field's popup. */
  onToggle: () => void;
  /** Closes this field's popup. */
  onClose: () => void;
  /** Applies a new CSS color. */
  onChange: (value: string) => void;
  /** Clears the color, letting the theme's own show through again. */
  onReset: () => void;
}> = ({ label, value, isOpen, onToggle, onClose, onChange, onReset }) => (
  <div className="relative flex items-center justify-between gap-3">
    <span className="text-sm text-primary-60">{label}</span>
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-mono text-xs text-primary-40">
        {value === "" ? "inherit" : value}
      </span>
      <ColorSwatchButton
        name={label.toLowerCase()}
        color={value}
        size="chip"
        isOpen={isOpen}
        isEdited={value !== ""}
        onToggle={onToggle}
      />
    </span>
    {isOpen && (
      <ColorPopup
        name={label.toLowerCase()}
        value={value}
        pickerFallback="#ffffff"
        onChange={onChange}
        onReset={value === "" ? undefined : onReset}
        onClose={onClose}
      />
    )}
  </div>
);

/**
 * One overridable non-color theme field: a switch that turns the override on
 * (seeding it with the library's default, so the field starts from a valid
 * value) and off (dropping it, so the default applies again), plus the text
 * field editing it while it is on. Mirrors the custom-style switches in the
 * transcript example, but writes to `customThemeStore` — the same store the
 * Colors gallery edits — so every override travels together into the theme.
 */
const GeneralField: FC<{
  /** The `Theme` key this control overrides. */
  fieldKey: EditableGeneralKey;
  /** What the field sets, e.g. `Font family`. */
  label: string;
}> = ({ fieldKey, label }) => {
  const overrides = useCustomTheme();
  const value = overrides[fieldKey];
  return (
    <>
      <Switch
        label={label}
        value={value == null ? "off" : "on"}
        onChange={(next) => {
          if (next === "on") {
            customThemeStore.setField(fieldKey, defaultTheme[fieldKey]);
          } else {
            customThemeStore.resetField(fieldKey);
          }
        }}
      />
      {value != null && (
        <ControlGroupNested>
          <TextControl
            label="Value"
            value={value}
            placeholder={defaultTheme[fieldKey]}
            onChange={(next) => {
              customThemeStore.setField(fieldKey, next);
            }}
          />
        </ControlGroupNested>
      )}
    </>
  );
};

/** The non-color theme fields, grouped the way they are presented. */
const GENERAL_GROUPS: {
  /** What the fields inside configure. */
  title: string;
  /** The fields, in display order. */
  fields: { key: EditableGeneralKey; label: string }[];
}[] = [
  {
    title: "Typography",
    fields: [{ key: "fontFamily", label: "Font family" }],
  },
  {
    title: "Corner radii",
    fields: [
      { key: "innerBorderRadius", label: "Inner radius" },
      { key: "outerBorderRadius", label: "Outer radius" },
    ],
  },
  {
    title: "Stacking order",
    fields: [
      { key: "zIndexTouchpoint", label: "Touchpoint z-index" },
      { key: "zIndexLaunchButton", label: "Launch button z-index" },
    ],
  },
];

/*
  The General entry edits the theme's non-color fields. Like the Colors gallery,
  it writes to `customThemeStore`, which is the single `Partial<Theme>` handed to
  every surface that renders library components: this shadow root (see
  `LibrarySurface`), the mock screen previews (see `DesignSystem`), the launched
  widget (see `useTouchpoint`) and the generated `create()` snippet (see
  `snippets.ts`). So an override here shows up everywhere the colors do.

  The preview below is the surface in miniature — a `rounded-outer` container
  with `BackgroundDecoration` behind it and a default card inside — so the font
  and both radii are visible as they change. The two z-indexes have nothing to
  stack against inside a specimen; they apply to the launched widget and the
  mock screens.
*/
const GeneralConfiguration: FC<SpecimenProps> = () => {
  const overrides = useCustomTheme();
  const settings = useSettings();
  const hasEdits = EDITABLE_GENERAL_KEYS.some((key) => key in overrides);
  return (
    <div className="flex flex-col items-start gap-6">
      <div className="flex w-full items-center justify-between gap-3">
        <SmallText>
          Overrides apply to every specimen on this page, the chat frame
          previews and the launched widget.
        </SmallText>
        {hasEdits && (
          <EditorButton
            onClick={() => {
              customThemeStore.restoreDefaults(EDITABLE_GENERAL_KEYS);
            }}
          >
            <Icons.Refresh size={12} className="text-primary-60" />
            Restore defaults
          </EditorButton>
        )}
      </div>
      <div className="grid w-full grid-cols-2 gap-6">
        {GENERAL_GROUPS.map((group) => (
          <ControlGroup key={group.title} title={group.title}>
            {group.fields.map((field) => (
              <GeneralField
                key={field.key}
                fieldKey={field.key}
                label={field.label}
              />
            ))}
          </ControlGroup>
        ))}
      </div>
      {/* `relative` + `isolate` match `Main`: they keep the decoration's `-z-10`
          layers inside this box, above its translucent fill but below the
          content. `rounded-outer` and the card's own `rounded-inner` are the
          two radii, so both overrides are visible here. */}
      <div className="relative isolate w-full overflow-hidden rounded-outer border border-solid border-primary-10 p-6">
        <BackgroundDecoration
          backgroundDepthLayer={settings.backgroundDepthLayer === "on"}
        />
        <div className="max-w-[400px] space-y-3">
          <BaseText>
            Your flight to Seattle is confirmed. Here are the details.
          </BaseText>
          <CustomCard>
            <CustomCardImageRow src={CARD_IMAGE} alt="" />
            <CustomCardRow
              left={<BaseText faded>Departure</BaseText>}
              right={
                <>
                  <BaseText>8:15 AM</BaseText>
                  <SmallText>Nonstop</SmallText>
                </>
              }
              icon={Icons.ArrowForward}
            />
            <CustomCardRow
              left={<BaseText>Blue Airlines 101</BaseText>}
              right={<BaseText>$312</BaseText>}
            />
          </CustomCard>
          <SmallText>
            Stacking order applies where Touchpoint overlays a page — the
            launched widget and the mock screens.
          </SmallText>
        </div>
      </div>
    </div>
  );
};

/**
 * The pair of `Settings` fields making up one side of the transcript's bubbles:
 * whether the bubble is drawn, and the inline style applied to it. Addressing
 * them by key keeps the controls below identical for the user and the agent.
 */
const BUBBLE_FIELDS = {
  user: { bubble: "userMessageBubble", style: "userMessageBubbleStyle" },
  agent: { bubble: "agentMessageBubble", style: "agentMessageBubbleStyle" },
} as const satisfies Record<string, Record<string, keyof Settings>>;

/**
 * One side's bubble controls: whether the bubble is drawn at all and — only
 * when it is — whether its style is customized, with the fields for the three
 * properties that make up the style object.
 *
 * The style object in `Settings` is the whole state: its presence *is* the
 * "Custom style" switch, and the fields write its `backgroundColor`, `color`
 * and `borderRadius` directly, so what they show is exactly what is handed to
 * `Messages` (and to `create()` on launch).
 */
const BubbleControls: FC<{
  /** Which side of the transcript these controls drive. */
  side: keyof typeof BUBBLE_FIELDS;
  /** Human-readable name of the side, e.g. `User`. */
  label: string;
  /** Identifier of the color popup currently open, if any. */
  openColor: string | null;
  /** Opens one of this side's color popups, or closes them all with `null`. */
  onOpenColor: (id: string | null) => void;
}> = ({ side, label, openColor, onOpenColor }) => {
  const settings = useSettings();
  const fields = BUBBLE_FIELDS[side];
  const hasBubble = settings[fields.bubble] === "on";
  const style = settings[fields.style];
  const setProperty = (property: keyof BubbleStyle, value: string): void => {
    // A cleared field drops the property rather than setting an empty value, so
    // the object stays exactly what Touchpoint should apply.
    const next: BubbleStyle = Object.fromEntries(
      Object.entries({ ...style, [property]: value }).filter(
        ([, entry]) => entry !== "",
      ),
    );
    settingsStore.set(fields.style, next);
  };
  const color = (property: "backgroundColor" | "color", name: string) => {
    const id = `${side}-${property}`;
    return (
      <ColorControl
        label={name}
        value={style?.[property] ?? ""}
        isOpen={openColor === id}
        onToggle={() => {
          onOpenColor(openColor === id ? null : id);
        }}
        onClose={() => {
          onOpenColor(null);
        }}
        onChange={(value) => {
          setProperty(property, value);
        }}
        onReset={() => {
          setProperty(property, "");
        }}
      />
    );
  };
  return (
    <ControlGroup title={`${label} messages`}>
      <Switch
        label="Message bubble"
        value={settings[fields.bubble]}
        onChange={(value) => {
          settingsStore.set(fields.bubble, value);
          onOpenColor(null);
        }}
      />
      {hasBubble && (
        <ControlGroupNested>
          <Switch
            label="Custom style"
            value={style == null ? "off" : "on"}
            onChange={(value) => {
              settingsStore.set(
                fields.style,
                value === "on" ? { ...DEFAULT_BUBBLE_STYLE } : undefined,
              );
              onOpenColor(null);
            }}
          />
          {style != null && (
            <>
              {color("backgroundColor", "Background")}
              {color("color", "Text")}
              <TextControl
                label="Radius"
                value={style.borderRadius ?? ""}
                placeholder="20px"
                onChange={(value) => {
                  setProperty("borderRadius", value);
                }}
              />
            </>
          )}
        </ControlGroupNested>
      )}
    </ControlGroup>
  );
};

/*
  The transcript example renders the real `Messages` component over the mock
  conversation, inline (not fixed-position like `MockText`) in a 400px column,
  with the controls that drive it alongside.

  Every customization it offers lives in the playground's `Settings` (see
  `settings.ts`), held in `settingsStore` rather than local state, so the mock
  chat frames and the launched widget pick up the same choices. Colors come from
  the shared custom theme, so the Colors gallery's edits apply here too.
*/
const TranscriptExample: FC<SpecimenProps> = ({ colorMode }) => {
  const settings = useSettings();
  // One color popup at a time, across every group of controls.
  const [openColor, setOpenColor] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-6">
      <div className="flex w-full items-center justify-between gap-3">
        <SmallText>
          Customizations apply to the chat frame previews and to the launched
          widget.
        </SmallText>
        {hasTranscriptEdits(settings) && (
          <EditorButton
            onClick={() => {
              restoreTranscriptDefaults();
              setOpenColor(null);
            }}
          >
            <Icons.Refresh size={12} className="text-primary-60" />
            Reset all
          </EditorButton>
        )}
      </div>
      <div className="w-full grid grid-cols-2 gap-6">
        <BubbleControls
          side="user"
          label="User"
          openColor={openColor}
          onOpenColor={setOpenColor}
        />
        <BubbleControls
          side="agent"
          label="Agent"
          openColor={openColor}
          onOpenColor={setOpenColor}
        />
        <ControlGroup title="Participants">
          <Switch
            label="Show participant info"
            value={settings.avatars}
            onChange={(avatars) => {
              settingsStore.patch({ avatars });
            }}
          />
          {settings.avatars === "on" && (
            <ControlGroupNested>
              <TextControl
                label="Name"
                value={settings.assistantName}
                placeholder="Assistant"
                onChange={(assistantName) => {
                  settingsStore.patch({ assistantName });
                }}
              />
              <TextControl
                label="Icon URL"
                value={settings.assistantIcon}
                placeholder="https://…/icon.png"
                onChange={(assistantIcon) => {
                  settingsStore.patch({ assistantIcon });
                }}
              />
            </ControlGroupNested>
          )}
        </ControlGroup>
        <ControlGroup title="Surface">
          <Switch
            label="Background depth layer"
            value={settings.backgroundDepthLayer}
            onChange={(backgroundDepthLayer) => {
              settingsStore.patch({ backgroundDepthLayer });
            }}
          />
        </ControlGroup>
      </div>
      {/* Inline, in a 400px column, so the bubbles wrap the way they do in the
          widget's narrow layouts. `relative` + `isolate` match `Main`: they
          keep the decoration's `-z-10` layers inside this box, above its
          translucent fill but below the transcript. */}
      <div className="relative isolate h-200 w-full overflow-hidden rounded-outer border border-solid border-primary-10">
        <BackgroundDecoration
          backgroundDepthLayer={settings.backgroundDepthLayer === "on"}
        />
        <Messages
          handler={mockConversationHandler}
          responses={responses}
          userMessageBubble={settings.userMessageBubble === "on"}
          agentMessageBubble={settings.agentMessageBubble === "on"}
          userMessageBubbleStyle={settings.userMessageBubbleStyle}
          agentMessageBubbleStyle={settings.agentMessageBubbleStyle}
          showParticipantInfo={settings.avatars === "on"}
          assistantName={settings.assistantName}
          {...(settings.assistantIcon !== ""
            ? { assistantIcon: settings.assistantIcon }
            : {})}
          avatarShape={settings.avatarShape}
          chatMode
          colorMode={colorMode}
          uploadedFiles={{}}
          lastApplicationResponseIndex={3}
          modalityComponents={defaultModalities}
          enabled
          className="h-full"
        />
      </div>
    </div>
  );
};

/** Props every specimen gallery receives. */
export interface SpecimenProps {
  /** Color mode the surface renders in. */
  colorMode: ColorMode;
}

/** One entry in the design system's navigation. */
export interface Specimen {
  /** URL fragment identifying the entry. */
  id: string;
  /** Navigation and heading label. */
  title: string;
  /** One-line note about the component, shown under the heading. */
  description: string;
  /** The gallery of variants. */
  Component: FC<SpecimenProps>;
  /**
   * Where the entry renders: `library` (the default) in a shadow root with the
   * library's stylesheet, so its components look exactly as they do in the
   * widget; `page` in the playground's own DOM, for entries made of page
   * chrome rather than library components.
   */
  surface?: "library" | "page";
  /**
   * `html`-tagged-template snippet reproducing this gallery in a custom
   * modality, shown only for components exported to that `html` instance
   * (see `src/index.tsx`). Omitted for gallery-only entries like colors,
   * icons, or components not exposed to custom modalities.
   */
  code?: string;
  /**
   * The `create()` snippet reproducing this entry's customizations, for the
   * configuration entries. A component rather than a string because the
   * snippet tracks the live edits: it subscribes to the store the entry writes
   * to and emits only the fields that are set. Renders in the playground's own
   * DOM, below the gallery.
   */
  Snippet?: FC;
}

/** The `create()` snippet for the General entry's theme overrides. */
const GeneralSnippet: FC = () => {
  const overrides = useCustomTheme();
  return (
    <CodeBlock code={buildThemeSnippet(overrides, EDITABLE_GENERAL_KEYS)} />
  );
};

/** The `create()` snippet for the Colors entry's theme overrides. */
const ColorsSnippet: FC = () => {
  const overrides = useCustomTheme();
  return <CodeBlock code={buildThemeSnippet(overrides, EDITABLE_COLOR_KEYS)} />;
};

/** The `create()` snippet for the transcript entry's customizations. */
const TranscriptSnippet: FC = () => {
  const settings = useSettings();
  return <CodeBlock code={buildTranscriptSnippet(settings)} />;
};

/** The theme configuration entries, in navigation order. */
export const CONFIGURATION_SPECIMENS: Specimen[] = [
  {
    id: "general",
    title: "General",
    description:
      "The theme's non-color fields — font stack, corner radii and stacking order — each overridable on its own. Overrides apply to every surface and to the launched widget.",
    Component: GeneralConfiguration,
    Snippet: GeneralSnippet,
  },
  {
    id: "colors",
    title: "Colors",
    description:
      "Every color in the theme, by its `Theme` key. Swatches reflect the theme currently applied to this surface.",
    Component: ColorGrid,
    Snippet: ColorsSnippet,
  },
];

/** Every component gallery, in navigation order. */
export const COMPONENT_SPECIMENS: Specimen[] = [
  {
    id: "cards",
    title: "Cards",
    description:
      "Composable cards: rows of left/right content, an image row, and selected/clickable/link states.",
    Component: Cards,
    code: `import { html } from "@amazon-connect-touchpoint/web";

const MyModality = ({ data, conversationHandler }) => html\`
  <CustomCard
    selected=\${data.selected}
    onClick=\${() => conversationHandler.sendText(data.label)}
  >
    <CustomCardImageRow src=\${data.image} alt="" />
    <CustomCardRow
      left=\${html\`<BaseText>\${data.label}</BaseText>\`}
      right=\${html\`<BaseText faded>\${data.price}</BaseText>\`}
      icon=\${Icons.ArrowForward}
    />
  </CustomCard>
\`;`,
  },
  {
    id: "carousel",
    title: "Carousel",
    description:
      "Horizontally scrollable row of cards, draggable with the pointer.",
    Component: Carousels,
    code: `import { html } from "@amazon-connect-touchpoint/web";

// This modality expects the application message to provide a "cities" array, e.g.:
// {
//   "cities": [
//     { "name": "Seattle", "price": "from $189", "image": "https://example.com/seattle.jpg" },
//     { "name": "Portland", "price": "from $189", "image": "https://example.com/portland.jpg" },
//     { "name": "Vancouver", "price": "from $189", "image": "https://example.com/vancouver.jpg" },
//     { "name": "San Diego", "price": "from $189", "image": "https://example.com/san-diego.jpg" },
//     { "name": "Austin", "price": "from $189", "image": "https://example.com/austin.jpg" }
//   ]
// }
const MyModality = ({ data, conversationHandler }) => html\`
  <Carousel>
    \${data.cities.map(
      (city) => html\`
        <CustomCard onClick=\${() => conversationHandler.sendText(city.name)}>
          <CustomCardImageRow src=\${city.image} alt="" />
          <CustomCardRow
            left=\${html\`<BaseText>\${city.name}</BaseText>\`}
            right=\${html\`<BaseText faded>\${city.price}</BaseText>\`}
          />
        </CustomCard>
      \`,
    )}
  </Carousel>
\`;`,
  },
  {
    id: "date-input",
    title: "Date input",
    description:
      "Masked date field with a native picker; submits an ISO (YYYY-MM-DD) date.",
    Component: DateInputs,
    code: `import { html } from "@amazon-connect-touchpoint/web";

const MyModality = ({ conversationHandler }) => html\`
  <DateInput onSubmit=\${(date) => conversationHandler.sendText(date)} />
\`;`,
  },
  {
    id: "icon-buttons",
    title: "Icon buttons",
    description:
      "Round icon-only buttons; the label becomes the accessible name and the tooltip.",
    Component: IconButtons,
    code: `import { html } from "@amazon-connect-touchpoint/web";

const MyModality = ({ conversationHandler }) => html\`
  <div style="display: flex; gap: 8px;">
    <IconButton
      type="main"
      label="Dismiss"
      Icon=\${Icons.Close}
      onClick=\${() => conversationHandler.sendText("Dismiss")}
    />
    <IconButton
      type="ghost"
      label="Dismiss"
      Icon=\${Icons.Close}
      onClick=\${() => conversationHandler.sendText("Dismiss")}
    />
  </div>
\`;`,
  },
  {
    id: "icons",
    title: "Icons",
    description: "Every icon exported as `Icons` from the package.",
    Component: IconGrid,
    code: `import { html } from "@amazon-connect-touchpoint/web";

// Icons are available under their own name, without an "Icons." prefix.
const MyModality = () => html\`
  <div style="display: flex; gap: 8px;">
    <ArrowForward size=\${20} />
    <Close size=\${20} />
    <ThumbUp size=\${20} />
    <Check size=\${20} />
  </div>
\`;`,
  },
  {
    id: "launch-button",
    title: "Launch button",
    description:
      "Opens the widget when Touchpoint is not embedded. Accepts a custom icon or component.",
    Component: LaunchButtons,
  },
  {
    id: "loader",
    title: "Loader",
    description: "The thinking indicator, optionally with a caption.",
    Component: Loaders,
  },
  {
    id: "message-buttons",
    title: "Message buttons",
    description: "Compact icon buttons used within the message transcript.",
    Component: MessageButtons,
    code: `import { html } from "@amazon-connect-touchpoint/web";

const MyModality = ({ data, conversationHandler }) => html\`
  <div style="display: flex; gap: 8px;">
    <MessageButton
      type=\${data.liked ? "selected" : "default"}
      label="Like"
      Icon=\${Icons.ThumbUp}
      onClick=\${() => conversationHandler.sendText("Like")}
    />
    <MessageButton
      type=\${data.liked ? "unselected" : "default"}
      label="Dislike"
      Icon=\${Icons.ThumbDown}
      onClick=\${() => conversationHandler.sendText("Dislike")}
    />
  </div>
\`;`,
  },
  {
    id: "message-status-row",
    title: "Message status row",
    description:
      "Delivery status shown under the most recent user message: sending, sent, delivered, read, or failed.",
    Component: MessageStatusRows,
  },
  {
    id: "text-button-groups",
    title: "Text button groups",
    description:
      "A bordered stack of `grouped` text buttons, for offering a short list of replies. Only `grouped` text buttons belong inside.",
    Component: TextButtonGroups,
  },
  {
    id: "text-buttons",
    title: "Text buttons",
    description:
      "Full-width buttons with a visible label. Omitting onClick disables the button.",
    Component: TextButtons,
    code: `import { html } from "@amazon-connect-touchpoint/web";

const MyModality = ({ conversationHandler }) => html\`
  <div style="display: flex; gap: 8px;">
    <TextButton
      type="main"
      label="Confirm"
      Icon=\${Icons.ArrowForward}
      onClick=\${() => conversationHandler.sendText("Confirm")}
    />
    <TextButton
      type="error"
      label="Cancel"
      Icon=\${Icons.Close}
      onClick=\${() => conversationHandler.sendText("Cancel")}
    />
  </div>
\`;`,
  },
  {
    id: "typography",
    title: "Typography",
    description: "The two text primitives available to custom modalities.",
    Component: Typography,
    code: `import { html } from "@amazon-connect-touchpoint/web";

const MyModality = () => html\`
  <div>
    <BaseText>This is some standard text.</BaseText>
    <BaseText faded>This is some faded text.</BaseText>
    <SmallText>This is some small text.</SmallText>
  </div>
\`;`,
  },
];

/** The end-to-end examples, in navigation order. */
export const EXAMPLE_SPECIMENS: Specimen[] = [
  {
    id: "chat-transcript",
    title: "Chat transcript",
    description:
      "The chat transcript over a mock conversation, with the bubble and participant-info customizations the playground supports. Choices made here apply to the mock screens and to the launched widget.",
    Component: TranscriptExample,
    Snippet: TranscriptSnippet,
  },
  {
    id: "mock-screens",
    title: "Mock screens",
    description:
      "The library's top-level widget shells over a mock conversation: chat, full-screen voice and voice mini, in each presentation. Launching one covers the page until it is closed.",
    Component: MockScreens,
  },
];

/** One group of entries in the design system's navigation. */
export interface SpecimenSection {
  /** Heading above the group in the sidebar. */
  label: string;
  /** The entries, in navigation order. */
  specimens: Specimen[];
}

/** The navigation, in order. */
export const SPECIMEN_SECTIONS: SpecimenSection[] = [
  { label: "Configuration", specimens: CONFIGURATION_SPECIMENS },
  { label: "Components", specimens: COMPONENT_SPECIMENS },
  { label: "Examples", specimens: EXAMPLE_SPECIMENS },
];

/** Every entry, flattened, for resolving the address in the fragment. */
export const SPECIMENS: Specimen[] = SPECIMEN_SECTIONS.flatMap(
  (section) => section.specimens,
);
