import clsx from "clsx";
import { type FC, type ReactNode, useEffect, useState } from "react";
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
import { type MessageStatus } from "../../interface";
import { LaunchButton } from "../../components/ui/LaunchButton";
import { Loader } from "../../components/ui/Loader";
import {
  MessageButton,
  type MessageButtonType,
} from "../../components/ui/MessageButton";
import { MessageStatusRow } from "../../components/ui/MessageStatusRow";
import { TextButton } from "../../components/ui/TextButton";
import { BaseText, SmallText } from "../../components/ui/Typography";
import { defaultTheme } from "../../components/Theme";
import {
  customThemeStore,
  type EditableColorKey,
  isEditableColorKey,
  useCustomTheme,
} from "../customTheme";

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
    <Row label="main" columns>
      <TextButton
        type="main"
        onClick={noop}
        label="Main default"
        Icon={Icons.ArrowForward}
      />
      <TextButton type="main" label="Main disabled" Icon={Icons.ArrowForward} />
    </Row>
    <Row label="ghost (default)" columns>
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
    <Row label="error" columns>
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
      <Row key={type} label={type}>
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
      <Row key={type} label={type}>
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
 * A group of swatches. `pairs` lays them out two-by-two, so each primary step
 * sits beside the secondary step at the same alpha — they're mirror images, and
 * the pairing shows that.
 */
interface ColorGroup {
  label: string;
  pairs?: boolean;
  colors: Swatch[];
}

const COLOR_GROUPS: ColorGroup[] = [
  {
    label: "primary and secondary",
    pairs: true,
    colors: [
      { name: "primary", className: "bg-primary" },
      { name: "secondary", className: "bg-secondary" },
      { name: "primary90", className: "bg-primary-90" },
      { name: "secondary90", className: "bg-secondary-90" },
      { name: "primary80", className: "bg-primary-80" },
      { name: "secondary80", className: "bg-secondary-80" },
      { name: "primary60", className: "bg-primary-60" },
      { name: "secondary60", className: "bg-secondary-60" },
      { name: "primary40", className: "bg-primary-40" },
      { name: "secondary40", className: "bg-secondary-40" },
      { name: "primary20", className: "bg-primary-20" },
      { name: "secondary20", className: "bg-secondary-20" },
      { name: "primary10", className: "bg-primary-10" },
      { name: "secondary10", className: "bg-secondary-10" },
      { name: "primary5", className: "bg-primary-5" },
      { name: "secondary5", className: "bg-secondary-5" },
      { name: "primary1", className: "bg-primary-1" },
      { name: "secondary1", className: "bg-secondary-1" },
    ],
  },
  {
    label: "accent and surfaces",
    colors: [
      { name: "accent", className: "bg-accent" },
      { name: "accent20", className: "bg-accent-20" },
      { name: "background", className: "bg-background" },
      { name: "overlay", className: "bg-overlay" },
    ],
  },
  {
    label: "status",
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
  The editor UI below renders in the shadow root alongside the swatches, so it
  can't rely on the playground's Tailwind theme. Rather than depend on which
  utilities the *library* stylesheet happens to emit, it styles itself with
  inline styles that read the theme's own CSS custom properties (--color-*,
  --radius-inner) — the same variables ProviderStack sets — so the popup tracks
  light/dark and the edited palette automatically.
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
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: 0,
      border: "none",
      background: "none",
      fontSize: 12,
      whiteSpace: "nowrap",
      cursor: disabled ? "default" : "pointer",
      color: disabled ? "var(--color-primary-40)" : "var(--color-primary-80)",
    }}
  >
    {children}
  </button>
);

/** Matches a `#rgb`/`#rrggbb` color the native picker can display. */
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Popup with a color picker and a single CSS-color input for one color. */
const ColorEditorPopup: FC<{
  colorKey: EditableColorKey;
  onClose: () => void;
}> = ({ colorKey, onClose }) => {
  const overrides = useCustomTheme();
  const isEdited = colorKey in overrides;
  const value = overrides[colorKey] ?? defaultTheme[colorKey];
  // The native picker only understands hex; when the CSS color isn't one (e.g.
  // `rebeccapurple`, `rgb(...)`, `light-dark(...)`) it falls back to the seed
  // so it stays usable.
  const pickerValue = HEX_RE.test(value.trim())
    ? value.trim()
    : defaultTheme[colorKey];

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

  return (
    <>
      {/* Click-away backdrop; covers the viewport so a click anywhere closes. */}
      <div
        aria-hidden
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 40 }}
      />
      <div
        role="dialog"
        aria-label={`Edit ${colorKey} color`}
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          width: 208,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          borderRadius: "var(--radius-inner)",
          border: "1px solid var(--color-primary-20)",
          background: "var(--color-background)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
        }}
      >
        <input
          type="color"
          value={pickerValue}
          aria-label={`${colorKey} color picker`}
          onChange={(event) => {
            customThemeStore.setColor(colorKey, event.target.value);
          }}
          style={{
            width: "100%",
            height: 36,
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        />
        <input
          type="text"
          value={value}
          spellCheck={false}
          aria-label={`${colorKey} CSS color`}
          placeholder="e.g. #1c63da or rgb(28 99 218)"
          onChange={(event) => {
            customThemeStore.setColor(colorKey, event.target.value);
          }}
          style={{
            width: "100%",
            padding: "6px 8px",
            fontSize: 12,
            fontFamily: "monospace",
            borderRadius: 6,
            border: "1px solid var(--color-primary-20)",
            background: "transparent",
            color: "var(--color-primary)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <EditorButton
            disabled={!isEdited}
            onClick={() => {
              customThemeStore.resetColor(colorKey);
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

/** A swatch that opens {@link ColorEditorPopup}, flagged editable and edited. */
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
    <div
      className="flex flex-col items-center gap-2 text-center"
      style={{ position: "relative" }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Edit ${colorKey} color`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={clsx(
          "h-10 w-full rounded-[8px] border border-solid border-primary-20",
          className,
        )}
        style={{
          position: "relative",
          cursor: "pointer",
          ...(isOpen
            ? { outline: "2px solid var(--color-accent)", outlineOffset: 2 }
            : {}),
        }}
      >
        {/* Edit affordance: a chip in the corner marks the swatch as clickable. */}
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            display: "grid",
            placeItems: "center",
            width: 18,
            height: 18,
            borderRadius: 9999,
            background: "var(--color-background)",
          }}
        >
          <Icons.Edit size={12} className="text-primary-60" />
        </span>
        {isEdited && (
          // Filled dot: this color has been changed from its default.
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 2,
              left: 2,
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: "var(--color-accent)",
            }}
          />
        )}
      </button>
      <span className="text-xs break-all text-primary-60">
        {colorKey}
        {isEdited ? " (edited)" : ""}
      </span>
      {isOpen && <ColorEditorPopup colorKey={colorKey} onClose={onClose} />}
    </div>
  );
};

const ColorGrid: FC = () => {
  const overrides = useCustomTheme();
  const [openKey, setOpenKey] = useState<EditableColorKey | null>(null);
  const hasEdits = Object.keys(overrides).length > 0;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <SmallText>
          Click accent, primary or secondary to edit. Opacity variants derive
          automatically.
        </SmallText>
        {hasEdits && (
          <EditorButton
            onClick={() => {
              customThemeStore.restoreDefaults();
              setOpenKey(null);
            }}
          >
            <Icons.Refresh size={12} className="text-primary-60" />
            Restore defaults
          </EditorButton>
        )}
      </div>
      {COLOR_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <SmallText>{group.label}</SmallText>
          <div
            /* Fixed 120px tracks throughout, so every swatch is the same width —
               a pair group is two of them per row, the rest wrap to fit. */
            className={clsx(
              "grid gap-x-2 gap-y-4",
              group.pairs === true
                ? "grid-cols-[repeat(2,120px)]"
                : "grid-cols-[repeat(auto-fill,120px)]",
            )}
          >
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
    </>
  );
};

/** One entry in the design system's navigation. */
export interface Specimen {
  /** URL fragment identifying the entry. */
  id: string;
  /** Navigation and heading label. */
  title: string;
  /** One-line note about the component, shown under the heading. */
  description: string;
  /** The gallery of variants. */
  Component: FC;
}

/** Every component gallery, in navigation order. */
export const SPECIMENS: Specimen[] = [
  {
    id: "colors",
    title: "Colors",
    description:
      "Every color in the theme, by its `Theme` key. Swatches reflect the theme currently applied to this surface.",
    Component: ColorGrid,
  },
  {
    id: "text-buttons",
    title: "Text buttons",
    description:
      "Full-width buttons with a visible label. Omitting onClick disables the button.",
    Component: TextButtons,
  },
  {
    id: "icon-buttons",
    title: "Icon buttons",
    description:
      "Round icon-only buttons; the label becomes the accessible name and the tooltip.",
    Component: IconButtons,
  },
  {
    id: "message-buttons",
    title: "Message buttons",
    description: "Compact icon buttons used within the message transcript.",
    Component: MessageButtons,
  },
  {
    id: "message-status-row",
    title: "Message status row",
    description:
      "Delivery status shown under the most recent user message: sending, sent, delivered, read, or failed.",
    Component: MessageStatusRows,
  },
  {
    id: "launch-button",
    title: "Launch button",
    description:
      "Opens the widget when Touchpoint is not embedded. Accepts a custom icon or component.",
    Component: LaunchButtons,
  },
  {
    id: "typography",
    title: "Typography",
    description: "The two text primitives available to custom modalities.",
    Component: Typography,
  },
  {
    id: "cards",
    title: "Cards",
    description:
      "Composable cards: rows of left/right content, an image row, and selected/clickable/link states.",
    Component: Cards,
  },
  {
    id: "carousel",
    title: "Carousel",
    description:
      "Horizontally scrollable row of cards, draggable with the pointer.",
    Component: Carousels,
  },
  {
    id: "date-input",
    title: "Date input",
    description:
      "Masked date field with a native picker; submits an ISO (YYYY-MM-DD) date.",
    Component: DateInputs,
  },
  {
    id: "loader",
    title: "Loader",
    description: "The thinking indicator, optionally with a caption.",
    Component: Loaders,
  },
  {
    id: "icons",
    title: "Icons",
    description: "Every icon exported as `Icons` from the package.",
    Component: IconGrid,
  },
];
