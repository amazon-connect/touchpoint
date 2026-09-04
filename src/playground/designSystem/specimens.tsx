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
import { LaunchButton } from "../../components/ui/LaunchButton";
import { Loader } from "../../components/ui/Loader";
import { MessageButton } from "../../components/ui/MessageButton";
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
  "activated",
  "coverup",
  "overlay",
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
