import type { LiveSyncCustomAction } from "../interface";
import { type DemoActions, scrollToSection } from "./hooks";
import { NAVIGABLE_LABELS } from "./sections";

/**
 * The custom actions the assistant may invoke, wired to the demo page's state.
 * Each one mirrors the snippet shown in its section of the guide.
 *
 * Navigation is modeled as an explicit action so phrasing like "go to the button
 * example" reliably routes to a section (the native primitive didn't).
 */
export const buildLiveSyncActions = (
  { patch, addToOrder }: DemoActions,
  searchFlights: () => void,
): LiveSyncCustomAction[] => [
  {
    action: "set_contact_info",
    description: "Set the customer's name and email",
    schema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
      },
    },
    handler: ({ fullName, email }: { fullName?: string; email?: string }) => {
      patch({ fullName, email });
    },
  },
  {
    action: "set_cabin_class",
    description: "Choose the cabin class",
    schema: {
      type: "object",
      properties: {
        cabin: {
          type: "string",
          enum: ["economy", "premium", "business", "first"],
        },
      },
      required: ["cabin"],
    },
    handler: ({ cabin }: { cabin: string }) => {
      patch({ cabin });
    },
  },
  {
    action: "select_flight",
    description:
      "Select a flight. Options: BLU101 (8:15am, $312), BLU208 " +
      "(11:40am, $289), BLU330 (2:05pm, $255), BLU412 (6:30pm, $270).",
    schema: {
      type: "object",
      properties: {
        flightId: {
          type: "string",
          enum: ["BLU101", "BLU208", "BLU330", "BLU412"],
        },
      },
      required: ["flightId"],
    },
    handler: ({ flightId }: { flightId: string }) => {
      patch({ flight: flightId });
    },
  },
  {
    action: "set_extras",
    description: "Select trip extras (any number)",
    schema: {
      type: "object",
      properties: {
        extras: {
          type: "array",
          items: {
            type: "string",
            enum: ["bag", "legroom", "insurance", "priority"],
          },
        },
      },
      required: ["extras"],
    },
    handler: ({ extras }: { extras: string[] }) => {
      patch({ extras });
    },
  },
  {
    action: "set_departure",
    description: "Set the departure date and time",
    schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "24h HH:mm" },
      },
    },
    handler: ({ date, time }: { date?: string; time?: string }) => {
      patch({ departDate: date, departTime: time });
    },
  },
  {
    action: "search_flights",
    description: "Run the flight search",
    handler: () => {
      searchFlights();
    },
  },
  {
    action: "add_to_order",
    description: "Add one or more items to the customer's order",
    schema: {
      type: "object",
      properties: {
        item: { type: "string", description: "The item to add" },
        quantity: { type: "number", description: "How many" },
      },
      required: ["item", "quantity"],
    },
    handler: ({ quantity }: { item: string; quantity: number }) => {
      addToOrder(quantity);
    },
  },
  {
    action: "navigate",
    description:
      "Scroll to / open a section of this page. Use whenever the user asks to " +
      "go to, show, open, or jump to a section (e.g. 'go to the button example').",
    schema: {
      type: "object",
      properties: {
        section: { type: "string", enum: NAVIGABLE_LABELS },
      },
      required: ["section"],
    },
    handler: ({ section }: { section: string }) => {
      scrollToSection(section);
    },
  },
];
