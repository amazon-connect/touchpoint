/**
 * The guide's content, as data. Prose is authored in the inline-Markdown subset
 * understood by `renderInline`, which means a single source of truth feeds both
 * the rendered page and the "Copy as Markdown" export.
 */

/** A highlighted callout box: a bold lead-in plus a sentence of guidance. */
interface Callout {
  /** Bold lead-in, e.g. `When to use`. */
  label: string;
  /** Body copy (inline Markdown). */
  text: string;
}

/** One capability section of the guide. */
export interface SectionSpec {
  /** DOM id, also the anchor target. */
  id: string;
  /** Sidebar label, and the value the `navigate` action accepts. */
  navLabel: string;
  /** Renders as a top-level sidebar entry rather than a nested capability. */
  group?: boolean;
  /** Section heading. */
  title: string;
  /** Lead paragraphs (inline Markdown). */
  description?: string[];
  /** Callout boxes shown under the description. */
  callouts?: Callout[];
  /** Voice prompts the visitor can try. */
  prompts?: string[];
  /** Static code sample; sections with generated snippets omit this. */
  code?: string;
}

/** Page title and intro shown above the guide. */
export const GUIDE_HEADER = {
  title: "Welcome to Touchpoint",
  intro:
    "Touchpoint is a drop-in conversational UI and SDK for web and mobile apps. It natively supports text chat and voice — plus **Live Sync**, multimodal technology that synchronizes any two channels — for example a voice or chat conversation with the page. Get started below, then explore the Live Sync capabilities.",
};

/** Every section of the guide, in page order. */
export const SECTIONS: SectionSpec[] = [
  {
    id: "start",
    navLabel: "Getting started",
    group: true,
    title: "Getting started",
    description: [
      "Create a Touchpoint instance with your Amazon Connect Customer details and pick an `input` mode — `text`, `voice`, `voiceMini`, or `external` (no UI, for Live Sync only). The snippet below reflects the details you entered on the launch form.",
    ],
    callouts: [
      {
        label: "Tip",
        text: "Touchpoint also supports Live Sync — the `liveSync` block in `create()` connects it, so the assistant can drive the page. See the Live Sync section below.",
      },
    ],
  },
  {
    id: "livesync",
    navLabel: "Live Sync",
    group: true,
    title: "Live Sync",
    description: [
      "Live Sync lets the assistant drive this page while you talk to it. Most page controls are driven by **custom actions**: you register a named action with a JSON Schema, the assistant resolves what the user said into typed arguments, and your handler applies them to the page. Use the floating mic (bottom-right) and speak the prompts in each capability below.",
      "Actions are typically configured in **ACXD** — in the Canvas, as settings on the Live Sync node — so they're part of your deployed conversation design. This SDK also lets you define actions **on the fly** (as shown in the snippets below), which is ideal for rapid prototyping.",
    ],
  },
  {
    id: "text",
    navLabel: "Text field",
    title: "Text field",
    description: [
      "Capture free-text values (name, email) as typed arguments and set them on the inputs.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "names, emails, notes — any free-form value.",
      },
    ],
    prompts: ["My name is Jane Doe and my email is jane@example.com."],
    code: `{
  action: "set_contact_info",
  description: "Set the customer's name and email",
  schema: {
    type: "object",
    properties: {
      fullName: { type: "string" },
      email: { type: "string" },
    },
  },
  handler: ({ fullName, email }) => {
    setValue("fullName", fullName);
    setValue("email", email);
  },
}`,
  },
  {
    id: "dropdown",
    navLabel: "Dropdown",
    title: "Dropdown",
    description: [
      "Constrain the argument to the allowed options with an `enum`, then set the `<select>`.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "a fixed set of mutually-exclusive options kept compact.",
      },
    ],
    prompts: ["Set the cabin class to business."],
    code: `{
  action: "set_cabin_class",
  description: "Choose the cabin class",
  schema: {
    type: "object",
    properties: {
      cabin: { type: "string", enum: ["economy", "premium", "business", "first"] },
    },
    required: ["cabin"],
  },
  handler: ({ cabin }) => setValue("cabin", cabin),
}`,
  },
  {
    id: "radio",
    navLabel: "Single choice",
    title: "Single choice (radio) — choosing a flight",
    description: [
      "Give the model the list (ids + the details it should reason over) and let it resolve natural phrasing to one id. Describe the options in the schema so “the second one”, “before noon”, and “the cheapest” all map correctly.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "pick-one lists where the user describes the option rather than reading an id.",
      },
    ],
    prompts: [
      "I'll take the second one.",
      "The one that leaves before noon.",
      "Give me the cheapest flight.",
    ],
    code: `{
  action: "select_flight",
  description:
    "Select a flight. Options: BLU101 (8:15am, $312), BLU208 (11:40am, " +
    "$289), BLU330 (2:05pm, $255), BLU412 (6:30pm, $270).",
  schema: {
    type: "object",
    properties: {
      flightId: { type: "string", enum: ["BLU101", "BLU208", "BLU330", "BLU412"] },
    },
    required: ["flightId"],
  },
  handler: ({ flightId }) => setChecked("flight", flightId),
}`,
  },
  {
    id: "checkbox",
    navLabel: "Multi-select",
    title: "Multi-select (checkbox)",
    description: [
      "Accept an array argument and check every matching box — the caller can pick several at once.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "add-ons and preferences where more than one choice can apply.",
      },
    ],
    prompts: ["Add a checked bag and travel insurance."],
    code: `{
  action: "set_extras",
  description: "Select trip extras (any number)",
  schema: {
    type: "object",
    properties: {
      extras: {
        type: "array",
        items: { type: "string", enum: ["bag", "legroom", "insurance", "priority"] },
      },
    },
    required: ["extras"],
  },
  handler: ({ extras }) => setChecked("extras", extras),
}`,
  },
  {
    id: "datetime",
    navLabel: "Date & time",
    title: "Date & time",
    description: [
      "Take normalized `date` / `time` strings and set the native inputs — the assistant turns “next Friday at 6pm” into `YYYY-MM-DD` / `HH:mm`.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "scheduling — appointments, departures, reservations.",
      },
    ],
    prompts: ["Depart next Friday at 6:30 in the evening."],
    code: `{
  action: "set_departure",
  description: "Set the departure date and time",
  schema: {
    type: "object",
    properties: {
      date: { type: "string", description: "YYYY-MM-DD" },
      time: { type: "string", description: "24h HH:mm" },
    },
  },
  handler: ({ date, time }) => {
    if (date) setValue("departDate", date);
    if (time) setValue("departTime", time);
  },
}`,
  },
  {
    id: "button",
    navLabel: "Button",
    title: "Button",
    description: [
      "A button isn't a value — expose an action whose handler triggers the click.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "submit / search / continue and other on-page buttons you want the assistant to press.",
      },
    ],
    prompts: ["Search for flights."],
    code: `{
  action: "search_flights",
  description: "Run the flight search",
  handler: () => document.getElementById("searchBtn").click(),
}`,
  },
  {
    id: "custom",
    navLabel: "Free-form action",
    title: "Free-form action",
    description: [
      "Actions aren't limited to form controls — any app behavior can be a custom action.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "domain actions like “add to cart”, “apply a coupon”, “switch to dark mode”.",
      },
    ],
    prompts: ["Add two coffees to my order."],
    code: `{
  action: "add_to_order",
  description: "Add one or more items to the customer's order",
  schema: {
    type: "object",
    properties: {
      item: { type: "string" },
      quantity: { type: "number" },
    },
    required: ["item", "quantity"],
  },
  handler: ({ item, quantity }) => addToOrder(item, quantity),
}`,
  },
  {
    id: "navigation",
    navLabel: "Navigate",
    title: "Navigate the page",
    description: [
      "Navigation is modeled as a custom action — `navigate` — whose `section` argument is an `enum` of the reachable sections. The assistant resolves what the customer said (“go to the button example”) into a section name, and the handler scrolls there. An explicit action with an enumerated target routes far more reliably than free-form phrasing.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "multi-step flows and multi-page sites — “go to the button example”, “show me the dropdown”, “take me to script steps”.",
      },
    ],
    prompts: [
      "Go to the button example.",
      "Show me the dropdown.",
      "Take me to script steps.",
    ],
    code: `// Register navigation as a custom action:
await touchpoint.sendContext({
  actions: [
    {
      action: "navigate",
      description:
        "Scroll to / open a section of this page. Use whenever the user " +
        "asks to go to, show, open, or jump to a section.",
      schema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: ["Getting started", "Text field", "Button", "Script steps", /* … */],
          },
        },
        required: ["section"],
      },
      handler: ({ section }) => scrollToExample(section),
    },
  ],
});`,
  },
  {
    id: "steps",
    navLabel: "Script steps",
    title: "Live Sync script steps",
    description: [
      "Notify the ACXD application when the user reaches a defined point in a journey, so Live Sync can react and advance. This is processing signals from digital to drive the AI agent.",
    ],
    callouts: [
      {
        label: "When to use",
        text: "guided journeys where the voice script should keep pace with progress on the page.",
      },
      {
        label: "Setup",
        text: "script steps carry their own credentials — pass the `scriptId` and `apiKey` straight to `sendStep` (they are not part of the Live Sync config). Fill them in and fire a step:",
      },
    ],
  },
];

/** Section ids, in page order. */
export const SECTION_IDS = SECTIONS.map((section) => section.id);

/**
 * Destination names offered to the `navigate` action. "Live Sync" is omitted —
 * it is an introduction rather than a capability to jump to.
 */
export const NAVIGABLE_LABELS = SECTIONS.filter(
  (section) => section.id !== "livesync",
).map((section) => section.navLabel);

/**
 * Maps a natural destination ("Button", "the flights example", "review step") to
 * a section id. Automatic page context is off, so navigation resolves here
 * instead of relying on scraped links.
 */
const SECTION_ALIASES: Record<string, string[]> = {
  start: ["start", "getting started", "intro"],
  livesync: ["live sync", "livesync"],
  text: ["text", "name", "email", "contact"],
  dropdown: ["dropdown", "drop down", "cabin", "class"],
  radio: ["radio", "single", "flight"],
  checkbox: ["checkbox", "multi", "extra"],
  datetime: ["date", "time", "departure"],
  button: ["button", "search"],
  custom: ["custom", "free-form", "free form", "order"],
  navigation: ["navigate", "navigation"],
  steps: ["step", "script", "review"],
};

/** Resolves a section id or free-form destination name to a section id. */
export const resolveSectionId = (destination: string): string | null => {
  const needle = destination.toLowerCase().trim();
  if (SECTION_IDS.includes(needle)) {
    return needle;
  }
  for (const id of SECTION_IDS) {
    if (SECTION_ALIASES[id].some((alias) => needle.includes(alias))) {
      return id;
    }
  }
  return null;
};

/**
 * Serializes the guide to Markdown an LLM can consume. Interactive widgets are
 * skipped; generated snippets are passed in by the caller so the export matches
 * what is on screen.
 */
export const buildGuideMarkdown = (
  generatedCode: Record<string, string>,
): string => {
  const parts = [`# ${GUIDE_HEADER.title}`, GUIDE_HEADER.intro];
  for (const section of SECTIONS) {
    const lines = [`## ${section.title}`];
    for (const paragraph of section.description ?? []) {
      lines.push(paragraph);
    }
    for (const callout of section.callouts ?? []) {
      lines.push(`> **${callout.label}** ${callout.text}`);
    }
    for (const prompt of section.prompts ?? []) {
      lines.push(`- 🎙️ Say: “${prompt}”`);
    }
    const code = generatedCode[section.id] ?? section.code;
    if (code != null) {
      lines.push("```js\n" + code + "\n```");
    }
    parts.push(lines.join("\n\n"));
  }
  return parts.join("\n\n");
};
