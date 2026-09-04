import { type FC, useMemo, useState } from "react";
import type { ColorMode } from "../../interface";
import { Section } from "../components/Section";
import { Sidebar } from "../components/Sidebar";
import { useActiveSection, useDemoState, useFlightSearch } from "../hooks";
import { renderInline } from "../inline";
import { buildLiveSyncActions } from "../liveSyncActions";
import {
  buildGuideMarkdown,
  GUIDE_HEADER,
  SECTION_IDS,
  SECTIONS,
} from "../sections";
import { type Settings, UUID_RE } from "../settings";
import { buildCreateSnippet, buildStepSnippet } from "../snippets";
import { useTouchpoint } from "../useTouchpoint";
import { Button } from "../ui/Button";
import { Callout, Panel, StatusMessage } from "../ui/Callout";
import { CopyMarkdownButton } from "../ui/CodeBlock";
import { Disclosure, DisclosureLead } from "../ui/Disclosure";
import { Field, FieldRow, Select, TextInput } from "../ui/Field";
import { OptionRow } from "../ui/OptionRow";

const FLIGHTS = [
  {
    id: "BLU101",
    label: "Blue Airlines 101 — 8:15 AM, nonstop",
    price: "$312",
  },
  {
    id: "BLU208",
    label: "Blue Airlines 208 — 11:40 AM, nonstop",
    price: "$289",
  },
  { id: "BLU330", label: "Blue Airlines 330 — 2:05 PM, 1 stop", price: "$255" },
  {
    id: "BLU412",
    label: "Blue Airlines 412 — 6:30 PM, nonstop",
    price: "$270",
  },
];

const EXTRAS = [
  { value: "bag", label: "Checked bag" },
  { value: "legroom", label: "Extra legroom" },
  { value: "insurance", label: "Travel insurance" },
  { value: "priority", label: "Priority boarding" },
];

const CABINS = [
  { value: "", label: "Select…" },
  { value: "economy", label: "Economy" },
  { value: "premium", label: "Premium economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

/** Outcome of an in-guide action: the message plus whether it succeeded. */
interface Result {
  /** Message shown next to the button. */
  message: string;
  /** Whether to use the success treatment. */
  success: boolean;
}

const sectionsById = Object.fromEntries(
  SECTIONS.map((section) => [section.id, section]),
);

/**
 * The launched playground: the Live Sync capability guide, with each section's
 * interactive demo wired to the actions the assistant can invoke.
 */
export const GuideScreen: FC<{
  /** The launched (trimmed) configuration. */
  settings: Settings;
  /** Color mode handed to the widget. */
  colorMode: ColorMode;
}> = ({ settings, colorMode }) => {
  const [demo, demoActions] = useDemoState();
  const flightSearch = useFlightSearch();
  const activeId = useActiveSection(SECTION_IDS);

  const [contactId, setContactId] = useState("");
  const [contactResult, setContactResult] = useState<Result | null>(null);
  const [step, setStep] = useState({ scriptId: "", apiKey: "", stepId: "" });
  const [stepResult, setStepResult] = useState<Result | null>(null);

  // The scope + custom actions the assistant may invoke, sent after each
  // (re)connect once the session has a contact ID.
  const context = useMemo(
    () => ({
      scopes: ["booking"],
      actions: buildLiveSyncActions(demoActions, flightSearch.search),
    }),
    [demoActions, flightSearch.search],
  );
  const touchpoint = useTouchpoint({ settings, colorMode, context });

  const createSnippet = buildCreateSnippet({ settings, colorMode, contactId });
  const stepSnippet = buildStepSnippet(step);
  const malformedContactId = contactId !== "" && !UUID_RE.test(contactId);

  // Live Sync's contactId is fixed at create() time, so binding to a separate
  // contact means mounting a fresh instance.
  const connectToContact = (): void => {
    const trimmed = contactId.trim();
    if (trimmed === "") {
      setContactResult({
        message: "Enter a contact ID to connect.",
        success: false,
      });
      return;
    }
    if (!UUID_RE.test(trimmed)) {
      setContactResult({
        message: "Contact ID must be a valid UUID.",
        success: false,
      });
      return;
    }
    touchpoint.mount(trimmed);
    setContactResult({
      message: `Connected to contact ${trimmed}`,
      success: true,
    });
  };

  const sendStep = (): void => {
    const stepId = step.stepId.trim();
    const scriptId = step.scriptId.trim();
    const apiKey = step.apiKey.trim();
    if (stepId === "" || scriptId === "" || apiKey === "") {
      setStepResult({
        message: "Enter script ID, script API key, and a step ID.",
        success: false,
      });
      return;
    }
    touchpoint.sendStep({
      stepId,
      scriptId,
      apiKey,
      context: {
        // Optional context carried back to the script.
        flight: demo.flight === "" ? undefined : demo.flight,
      },
    });
    setStepResult({ message: "Step sent to the script", success: true });
  };

  return (
    <div className="mt-2 grid grid-cols-1 items-start md:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar activeId={activeId} />
      <div className="min-w-0 pb-[40vh] md:border-l md:border-line md:pb-[100vh] md:pl-16">
        <header className="border-b border-line pb-10 pt-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="mb-2.5 text-[26px] font-bold tracking-[-0.01em] text-heading md:text-[32px]">
              {GUIDE_HEADER.title}
            </h1>
            <CopyMarkdownButton
              getMarkdown={() =>
                buildGuideMarkdown({
                  start: createSnippet,
                  steps: stepSnippet,
                })
              }
            />
          </div>
          <p className="max-w-[60ch] text-muted">
            {renderInline(GUIDE_HEADER.intro)}
          </p>
        </header>

        <Section spec={sectionsById.start} code={createSnippet} />

        <Section spec={sectionsById.livesync}>
          {/* Binding a separate contact is the External-mode workflow; chat and
              voice just use their own session contact automatically. */}
          {settings.inputMode === "external" && (
            <>
              <Callout label="External mode">
                {renderInline(
                  "drives this page from a separate live contact. Set `liveSync.contactId` to that contact — most commonly an inbound **phone call** — so the caller's conversation drives the page Touchpoint is installed on. Bind one below.",
                )}
              </Callout>
              <Field
                label="Contact ID"
                htmlFor="contactId"
                tip="The existing contact to synchronize with — e.g. an inbound phone call. In External mode this is how the page is driven; see the patterns below for getting a call's contact ID onto the page."
              >
                <TextInput
                  id="contactId"
                  type="text"
                  placeholder="Sync to an existing contact, e.g. a phone call"
                  invalid={malformedContactId}
                  value={contactId}
                  onChange={(event) => {
                    setContactId(event.target.value);
                  }}
                />
              </Field>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={connectToContact}>
                  Connect via Live Sync
                </Button>
                <StatusMessage success={contactResult?.success}>
                  {contactResult?.message}
                </StatusMessage>
              </div>
              <Disclosure summary="Getting a phone call's contact ID onto the page">
                <DisclosureLead>
                  With an inbound phone call, the page needs the call&apos;s
                  contact ID to bind Live Sync to it. A few practical patterns:
                </DisclosureLead>
                <ul>
                  <li>
                    {renderInline(
                      "**SMS deep link.** During the call, send an SMS with a deep link to your digital asset (website / mobile app) and the contact ID appended as a query parameter (e.g. `?contactId=…`). The page reads it on load and passes it to `liveSync.contactId`.",
                    )}
                  </li>
                  <li>
                    {renderInline(
                      "**OTP handshake (no SMS).** The caller is on the phone and the digital asset at the same time:",
                    )}
                    <ul>
                      <li>
                        The asset shows a “connect” prompt asking for a code.
                      </li>
                      <li>
                        On the call, the assistant asks “Are you ready for the
                        code?” — the user says “yes”.
                      </li>
                      <li>The assistant reads out a one-time code.</li>
                      <li>The user enters it on the asset.</li>
                      <li>
                        Your backend exchanges the OTP for the contact ID —
                        eliminating the need for SMS.
                      </li>
                    </ul>
                  </li>
                  <li>
                    {renderInline(
                      "**Authenticated correlation.** The user is already signed in on the digital asset. When they call, the IVR identifies them (caller ID / account lookup) and your backend maps that identity to the open session, injecting the contact ID server-side — no manual step for the user.",
                    )}
                  </li>
                  <li>
                    {renderInline(
                      "**Scan-to-connect (QR / short code).** The asset shows a QR code or short code; the caller scans or reads it back on the call, and your backend links the scanned token to the active contact ID.",
                    )}
                  </li>
                </ul>
              </Disclosure>
            </>
          )}
        </Section>

        <Section spec={sectionsById.text}>
          <div className="mt-4">
            <Field label="Full name" htmlFor="fullName">
              <TextInput
                id="fullName"
                type="text"
                value={demo.fullName}
                onChange={(event) => {
                  demoActions.patch({ fullName: event.target.value });
                }}
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <TextInput
                id="email"
                type="email"
                value={demo.email}
                onChange={(event) => {
                  demoActions.patch({ email: event.target.value });
                }}
              />
            </Field>
          </div>
        </Section>

        <Section spec={sectionsById.dropdown}>
          <div className="mt-4">
            <Field label="Cabin class" htmlFor="cabin">
              <Select
                id="cabin"
                value={demo.cabin}
                onChange={(event) => {
                  demoActions.patch({ cabin: event.target.value });
                }}
              >
                {CABINS.map((cabin) => (
                  <option key={cabin.value} value={cabin.value}>
                    {cabin.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        <Section spec={sectionsById.radio}>
          <div className="mt-4">
            <p className="mb-1 text-[13px] text-muted">Choose a flight</p>
            {FLIGHTS.map((flight) => (
              <OptionRow
                key={flight.id}
                type="radio"
                name="flight"
                value={flight.id}
                meta={flight.price}
                checked={demo.flight === flight.id}
                onChange={() => {
                  demoActions.patch({ flight: flight.id });
                }}
              >
                {flight.label}
              </OptionRow>
            ))}
          </div>
        </Section>

        <Section spec={sectionsById.checkbox}>
          <div className="mt-4">
            <p className="mb-1 text-[13px] text-muted">Extras</p>
            {EXTRAS.map((extra) => (
              <OptionRow
                key={extra.value}
                type="checkbox"
                name="extras"
                value={extra.value}
                checked={demo.extras.includes(extra.value)}
                onChange={(checked) => {
                  demoActions.toggleExtra(extra.value, checked);
                }}
              >
                {extra.label}
              </OptionRow>
            ))}
          </div>
        </Section>

        <Section spec={sectionsById.datetime}>
          <div className="mt-4">
            <FieldRow>
              <Field label="Departure date" htmlFor="departDate">
                <TextInput
                  id="departDate"
                  type="date"
                  value={demo.departDate}
                  onChange={(event) => {
                    demoActions.patch({ departDate: event.target.value });
                  }}
                />
              </Field>
              <Field label="Departure time" htmlFor="departTime">
                <TextInput
                  id="departTime"
                  type="time"
                  value={demo.departTime}
                  onChange={(event) => {
                    demoActions.patch({ departTime: event.target.value });
                  }}
                />
              </Field>
            </FieldRow>
          </div>
        </Section>

        <Section spec={sectionsById.button}>
          <div className="mt-4">
            <Button className="w-full" onClick={flightSearch.search}>
              Search flights
            </Button>
            {/* The runway clips the planes, so nothing overflows the page. */}
            {flightSearch.running && (
              <div className="relative mt-3 h-12 overflow-hidden">
                {flightSearch.planes.map((plane) => (
                  <span
                    key={plane.id}
                    className="pg-plane"
                    aria-hidden="true"
                    style={{
                      top: `${String(plane.top)}px`,
                      fontSize: `${String(plane.size)}px`,
                      animationDuration: `${String(plane.duration)}s`,
                    }}
                    onAnimationEnd={() => {
                      flightSearch.land(plane.id);
                    }}
                  >
                    ✈️
                  </span>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section spec={sectionsById.custom}>
          <Panel>
            <p className="text-sm text-muted">order:</p>
            <p>
              <span className="text-[32px] font-semibold text-heading">
                {demo.orderCount}
              </span>
              <span className="ml-1 text-sm text-muted">item(s)</span>
            </p>
          </Panel>
        </Section>

        <Section spec={sectionsById.navigation} />

        <Section spec={sectionsById.steps} code={stepSnippet}>
          <Field
            label="Script ID"
            htmlFor="stepScriptId"
            tip="The Live Sync script to notify. Sent as journeyId in the request body."
          >
            <TextInput
              id="stepScriptId"
              type="text"
              placeholder="Script ID"
              value={step.scriptId}
              onChange={(event) => {
                setStep({ ...step, scriptId: event.target.value });
              }}
            />
          </Field>
          <Field
            label="Script API key"
            htmlFor="stepApiKey"
            tip="Live Sync script-specific API key, found under your Live Sync script deployment in ACXD."
          >
            <TextInput
              id="stepApiKey"
              type="text"
              placeholder="Script API key"
              value={step.apiKey}
              onChange={(event) => {
                setStep({ ...step, apiKey: event.target.value });
              }}
            />
          </Field>
          <Field
            label="Step ID"
            htmlFor="stepId"
            tip="The step within the script to advance to when this fires."
          >
            <TextInput
              id="stepId"
              type="text"
              placeholder="Step to fire"
              value={step.stepId}
              onChange={(event) => {
                setStep({ ...step, stepId: event.target.value });
              }}
            />
          </Field>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={sendStep}>Send step</Button>
            <StatusMessage success={stepResult?.success}>
              {stepResult?.message}
            </StatusMessage>
          </div>
        </Section>
      </div>
    </div>
  );
};
