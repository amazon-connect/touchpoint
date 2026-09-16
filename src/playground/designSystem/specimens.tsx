import clsx from "clsx";
import { type FC, type ReactNode, useState } from "react";
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
import { MessageButton } from "../../components/ui/MessageButton";
import { MessageStatusRow } from "../../components/ui/MessageStatusRow";
import { Radio } from "../../components/ui/Radio";
import { TextButton } from "../../components/ui/TextButton";
import { BaseText, SmallText } from "../../components/ui/Typography";

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
  "sound",
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

const MessageButtons: FC = () => (
  <>
    <Row label="main">
      <MessageButton
        type="main"
        onClick={noop}
        label="Main default"
        Icon={Icons.ThumbUp}
      />
      <MessageButton type="main" label="Main disabled" Icon={Icons.ThumbUp} />
    </Row>
    <Row label="activated">
      <MessageButton
        type="activated"
        onClick={noop}
        label="Activated default"
        Icon={Icons.ThumbUp}
      />
      <MessageButton
        type="activated"
        label="Activated disabled"
        Icon={Icons.ThumbUp}
      />
    </Row>
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

const Radios: FC = () => {
  const [cabin, setCabin] = useState("economy");
  const options = [
    { value: "economy", label: "Economy" },
    { value: "premium", label: "Premium economy" },
    { value: "business", label: "Business" },
  ];
  return (
    <>
      <Row label="default">
        <Radio
          name="ds-cabin"
          options={options}
          value={cabin}
          onChange={(value) => {
            setCabin(String(value));
          }}
        />
      </Row>
      <Row label="disabled (no onChange)">
        <Radio name="ds-cabin-disabled" options={options} value={cabin} />
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
      { name: "onAccent", className: "bg-on-accent" },
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

const ColorGrid: FC = () => (
  <>
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
          {group.colors.map((color) => (
            <ColorSwatch key={color.name} {...color} />
          ))}
        </div>
      </div>
    ))}
  </>
);

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
    id: "radio",
    title: "Radio",
    description: "Single-choice list.",
    Component: Radios,
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
