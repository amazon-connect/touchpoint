## Basics

### ConnectConfig

Amazon Connect Chat connection details. Passed to Touchpoint as
[TouchpointConfiguration.config](#config); Touchpoint builds the conversation
from it — there is no separate adapter to wire up.

#### Extends

- [`DetailsRequestParams`](#detailsrequestparams)

#### Properties

##### instanceId?

```ts
optional instanceId?: string;
```

Connect instance ID

###### Inherited from

[`DetailsRequestParams`](#detailsrequestparams).[`instanceId`](#instanceid)

##### contactFlowId?

```ts
optional contactFlowId?: string;
```

Contact flow ID to use

###### Inherited from

[`DetailsRequestParams`](#detailsrequestparams).[`contactFlowId`](#contactflowid)

##### participantDisplayName?

```ts
optional participantDisplayName?: string;
```

Customer display name

###### Inherited from

[`DetailsRequestParams`](#detailsrequestparams).[`participantDisplayName`](#participantdisplayname)

##### contactAttributes?

```ts
optional contactAttributes?: Record<string, string>;
```

Contact attributes passed to the contact flow

###### Inherited from

[`DetailsRequestParams`](#detailsrequestparams).[`contactAttributes`](#contactattributes)

##### supportedMessagingContentTypes?

```ts
optional supportedMessagingContentTypes?: string[];
```

Content types the chat participant supports receiving.
Defaults to text/plain, text/markdown, application/json, and interactive messages.

###### Inherited from

[`DetailsRequestParams`](#detailsrequestparams).[`supportedMessagingContentTypes`](#supportedmessagingcontenttypes)

##### chatEndpoint?

```ts
optional chatEndpoint?: string;
```

URL of your StartChatContact endpoint (e.g. an API Gateway route) that
mints a participant token. Required for chat unless `details` is supplied.

##### details?

```ts
optional details?:
  | ChatDetails
  | (() => Promise<ChatDetails>);
```

Pre-obtained chat details, as an alternative to `chatEndpoint`. May be a
value or a function returning a promise.

##### voiceEndpoint?

```ts
optional voiceEndpoint?: string;
```

URL of your StartWebRTCContact endpoint (e.g. an API Gateway route) that starts an
in-app/web voice call and returns its Chime connection data. Required for the `voice`
and `voiceMini` inputs.

##### region?

```ts
optional region?: string;
```

AWS region (e.g. "us-east-1"). Defaults to "us-west-2".

##### instanceUrl?

```ts
optional instanceUrl?: string;
```

Your Amazon Connect instance URL (e.g. `https://your-instance.my.connect.aws`).
Required to render step-by-step Guides / Views: Touchpoint loads the Connect view
renderer from `{instanceUrl}/connectwidget/static/views/renderer/latest/index.js`.

##### authenticationRedirectUri?

```ts
optional authenticationRedirectUri?: string;
```

Redirect URI for chat authentication (the "Authenticate Customer" flow
block). Passed to GetAuthenticationUrl as the URL the hosted identity-provider
login returns to after sign-in; must be registered as an allowed callback on
your identity provider. Defaults to the current page origin.

##### authenticationEndpoint?

```ts
optional authenticationEndpoint?: string;
```

Backend endpoint that completes chat authentication. After the customer
signs in and is redirected back with `code`/`state`, Touchpoint POSTs
`{ code, state, instanceId, error }` here; the endpoint must call
`connect:UpdateParticipantAuthentication` (an admin API that can't be called
from the browser). Required to complete authentication.

##### globalConfig?

```ts
optional globalConfig?: Record<string, unknown>;
```

Additional global config passed to `connect.ChatSession.setGlobalConfig()`.
See the amazon-connect-chatjs documentation for available options.

---

### create()

```ts
function create(props): Promise<TouchpointInstance>;
```

Creates a new Touchpoint UI instance and appends it to the document body

#### Parameters

##### props

[`TouchpointConfiguration`](#touchpointconfiguration)

Configuration props for Touchpoint

#### Returns

`Promise`\<[`TouchpointInstance`](#touchpointinstance)\>

A promise that resolves to a TouchpointInstance

---

### TouchpointConfiguration

Main Touchpoint creation properties object

#### Properties

##### config

```ts
config: ConnectConfig;
```

Amazon Connect Chat connection details. Touchpoint builds the conversation
from these — there is no separate adapter to wire up.

##### languageCode?

```ts
optional languageCode?: string;
```

BCP-47 language code used for built-in UI copy. Defaults to `en-US`.

##### showParticipantInfo?

```ts
optional showParticipantInfo?: boolean;
```

When `true`, each message shows the participant's avatar and name
(You / the assistant name / Agent). Defaults to `false` (bare transcript).

##### assistantName?

```ts
optional assistantName?: string;
```

Display name for the automated assistant, shown when `showParticipantInfo`
is enabled. Defaults to `AI`.

##### assistantIcon?

```ts
optional assistantIcon?: string;
```

URL of an image used as the assistant's avatar when `showParticipantInfo` is
enabled. Defaults to a generic assistant icon.

##### avatarShape?

```ts
optional avatarShape?: "round" | "square";
```

Shape of participant avatars when `showParticipantInfo` is enabled: fully
round, or a lightly-rounded square. Defaults to `round`.

##### escalationPhrase?

```ts
optional escalationPhrase?: string;
```

Message sent when the user picks "Talk to the agent" from the settings menu.
Amazon Connect has no client-side escalation API, so this text is sent to the
contact flow, which decides how to route to a human. Defaults to
`"I'd like to talk to an agent"`.

##### windowSize?

```ts
optional windowSize?: "half" | "full" | "floating" | "side-by-side";
```

Presentation layout for the expanded experience, defaults to `half`.

- `half`: overlay with the panel on the right and the rest of the page dimmed.
- `full`: overlay covering the whole viewport.
- `floating`: a detached, rounded panel hovering over the page without dimming
  it, so the site stays visible and interactive.
- `side-by-side`: a panel docked to the right edge for the full height; on
  wider viewports the page is narrowed by the panel's width so both can be
  used at once.

Applies to chat and full-screen voice; `voiceMini` is always a compact
floating widget.

##### colorMode?

```ts
optional colorMode?: "light" | "dark" | "light dark";
```

Optional color mode for the chat window, defaults to `dark`. Setting `light dark` enables automatic switching based on system settings.

##### brandIcon?

```ts
optional brandIcon?: string;
```

URL of icon used to display the brand in the chat header

##### animate?

```ts
optional animate?: boolean;
```

Include border animation. Currently only supported in Voice Mini.

##### launchIcon?

```ts
optional launchIcon?:
  | string
  | boolean
  |
  | ComponentClass<{
  className?: string;
  onClick?: () => void;
}, any>
  | FunctionComponent<{
  className?: string;
  onClick?: () => void;
}>;
```

URL of icon used on the launch icon in the bottom right when the experience is collapsed.

When set to `false`, no launch button is shown at all. When not set or set to `true`, the default launch icon is rendered.

##### userMessageBubble?

```ts
optional userMessageBubble?: boolean;
```

Specifies whether the user message has bubbles or not

##### agentMessageBubble?

```ts
optional agentMessageBubble?: boolean;
```

Specifies whether the agent message has bubbles or not

##### chatMode?

```ts
optional chatMode?: boolean;
```

Enables chat mode, a classic chat experience with inline loaders and the chat history visible at all times.

##### welcomeScreen?

```ts
optional welcomeScreen?: boolean;
```

Whether the immersive welcome screen is shown for a text conversation: the
opening assistant message (and any choices) centered vertically, and the
connecting/thinking state centered where the message will appear, until the
customer sends or selects something. Defaults to `true`. Set to `false` to
render the conversation as a top-anchored transcript from the first message.
Has no effect once modalities/guides are present or the conversation has
progressed.

##### welcomeScreenLogo?

```ts
optional welcomeScreenLogo?: boolean;
```

Whether to show the brand logo ([TouchpointConfiguration.brandIcon](#brandicon)) at
the top of the welcome screen. Defaults to `true`; has no effect when no
`brandIcon` is set or the welcome screen is disabled.

##### theme?

```ts
optional theme?: Partial<Theme>;
```

Optional theme object to override default theme values

##### modalityComponents?

```ts
optional modalityComponents?: Record<string, CustomModalityComponent<unknown>>;
```

Optional [custom modality components](#custommodalitycomponent) to render in Touchpoint

##### initializeConversation?

```ts
optional initializeConversation?: (handler, context?) => void;
```

Custom conversation init method. Defaults to sending the welcome flow.

###### Parameters

###### handler

`ConnectConversationHandler`

the conversation handler.

###### context?

`Context`

the context object

###### Returns

`void`

##### onContactEnded?

```ts
optional onContactEnded?: (event) => void;
```

Called when the underlying Amazon Connect contact ends — the voice call is
disconnected (including after an escalated agent resolves and hangs up) or
the chat contact is closed.

The event is cancelable. For voice inputs the default action collapses the
widget back to the launcher; call `event.preventDefault()` to keep it open
and handle the end yourself. Chat has no default action — the ended
transcript stays visible — so use this hook to collapse, navigate, or log as
needed (e.g. `touchpoint.expanded = false`).

###### Parameters

###### event

`Event`

a cancelable event; call `preventDefault()` to skip the default action.

###### Returns

`void`

##### input?

```ts
optional input?: "text" | "voice" | "voiceMini" | "external";
```

Controls the ways in which the user can communicate with the application. Defaults to `"text"`

##### showVoiceTranscript?

```ts
optional showVoiceTranscript?: boolean;
```

Sets whether the transcript is shown in `voice` and `voiceMini` inputs.

##### initialContext?

```ts
optional initialContext?: Context;
```

Context sent with the initial request.

##### liveSync?

```ts
optional liveSync?: LiveSyncConfig;
```

Enables liveSync mode of Live Sync. Will automatically set the liveSync flag in the config.

##### copy?

```ts
optional copy?: Partial<Copy>;
```

Copy

---

### TouchpointInstance

Instance of a Touchpoint UI component

#### Properties

##### expanded

```ts
expanded: boolean;
```

Controls whether the Touchpoint UI is expanded or collapsed

##### conversationHandler

```ts
conversationHandler: ConnectConversationHandler;
```

The conversation handler instance for interacting with the application

##### teardown

```ts
teardown: () => void;
```

Method to remove the Touchpoint UI from the DOM

###### Returns

`void`

##### setCustomLiveSyncActions

```ts
setCustomLiveSyncActions: (actions) => void;
```

Sets currently available custom liveSync actions.
This allows you to define custom actions that can be used in the voice bot.
The actions will be available in the voice bot and can be used to trigger actions.

Example:

```javascript
client.setCustomLiveSyncActions([
  {
    action: "Meal",
    description: "add a meal to your flight",
    schema: {
      enum: ["standard", "vegetarian", "vegan", "gluten-free"],
    },
    handler: (value) => {
      console.log("Meal option:", value);
    },
  },
]);
```

This will allow the voice bot to use the action `Meal` with the value `standard`, `vegetarian`, `vegan`, or `gluten-free`.

When using more complex arguments, a library such as [Zod](https://zod.dev) can be useful:

```javascript
import * as z from "zod/v4";

const schema = z.object({
  name: z.string().describe("The customer's name, such as John Doe"),
  email: z.string().email().describe("The customer's email address"),
});

client.setCustomLiveSyncActions([
  {
    action: "Meal",
    description: "add a meal to your flight",
    schema: z.toJSONSchema(schema, { io: "input" }),
    handler: (value) => {
      const result = z.safeParse(schema, value);
      if (result.success) {
        // result.data is now type safe and TypeScript can reason about it
        console.log("Meal option:", result.data);
      } else {
        console.error("Failed to parse Meal option:", result.error);
      }
    },
  },
]);
```

###### Parameters

###### actions

[`LiveSyncCustomAction`](#livesynccustomaction)[]

A list containing the custom actions to set.

###### Returns

`void`

##### sendContext

```ts
sendContext: (context) => Promise<void>;
```

Sends Live Sync context to the assistant: the custom actions it may invoke, scope tags
for the current application state, and/or the fields it can fill. Call this explicitly
whenever the page's actions, scope, or fields change. Action handlers are registered
locally for dispatch; their definitions (plus scopes and fields) are sent to the agent.

Example:

```javascript
await touchpoint.sendContext({
  scopes: ["checkout"],
  actions: [
    {
      action: "apply_coupon",
      description: "Apply a coupon code",
      schema: { type: "object", properties: { code: { type: "string" } } },
      handler: ({ code }) => applyCoupon(code),
    },
  ],
});
```

###### Parameters

###### context

`LiveSyncContextInput`

The actions, scopes, and/or fields to send.

###### Returns

`Promise`\<`void`\>

##### sendStep

```ts
sendStep: (params) => Promise<void>;
```

Notifies the Live Sync application that the user reached a defined script step — for
example completed a form section or navigated to a page — so a Live Sync script can
advance. Script steps carry their own credentials (workspace, script, key); optionally
pass context (e.g. field values) for the step.

Example:

```javascript
await touchpoint.sendStep({
  stepId: "2f9d…-step-id",
  scriptId: "…",
  apiKey: "…",
  context: { selectedSeat: "4A" },
});
```

###### Parameters

###### params

[`SendStepParams`](#sendstepparams)

The step id, script credentials, and optional context.

###### Returns

`Promise`\<`void`\>

## Theming

### Theme

The full theme expressed as CSS custom properties.
This means that for instance colors can be made to switch automatically based on the system color mode by using the `light-dark()` CSS function.
Note also that not all colors need to be provided manually. For instance if only `primary` is provided, the rest of the primary colors will be computed automatically based on it.
Therefore, for a fully custom but minimal theme, you only need to provide `accent`, `primary`, `secondary`, `background`, `overlay`, and potentially the warning and error colors.

#### Example

```typescript
const theme: Partial<Theme> = {
  primary: "light-dark(rgb(0, 2, 9), rgb(255, 255, 255))",
  secondary: "light-dark(rgb(255, 255, 255), rgb(0, 2, 9))",
  accent: "light-dark(rgb(28, 99, 218), rgb(174, 202, 255))",
  background: "light-dark(rgba(220, 220, 220, 0.9), rgba(0, 2, 9, 0.9))",
};
```

#### Properties

##### fontFamily

```ts
fontFamily: string;
```

Font family

##### primary

```ts
primary: string;
```

Primary color

##### primary90

```ts
primary90: string;
```

Primary color with 90% opacity

##### primary80

```ts
primary80: string;
```

Primary color with 80% opacity

##### primary60

```ts
primary60: string;
```

Primary color with 60% opacity

##### primary40

```ts
primary40: string;
```

Primary color with 40% opacity

##### primary20

```ts
primary20: string;
```

Primary color with 20% opacity

##### primary10

```ts
primary10: string;
```

Primary color with 10% opacity

##### primary5

```ts
primary5: string;
```

Primary color with 5% opacity

##### primary1

```ts
primary1: string;
```

Primary color with 1% opacity

##### secondary

```ts
secondary: string;
```

Secondary color

##### secondary90

```ts
secondary90: string;
```

Secondary color with 90% opacity

##### secondary80

```ts
secondary80: string;
```

Secondary color with 80% opacity

##### secondary60

```ts
secondary60: string;
```

Secondary color with 60% opacity

##### secondary40

```ts
secondary40: string;
```

Secondary color with 40% opacity

##### secondary20

```ts
secondary20: string;
```

Secondary color with 20% opacity

##### secondary10

```ts
secondary10: string;
```

Secondary color with 10% opacity

##### secondary5

```ts
secondary5: string;
```

Secondary color with 5% opacity

##### secondary1

```ts
secondary1: string;
```

Secondary color with 1% opacity

##### accent

```ts
accent: string;
```

Accent color used for prominent buttons (e.g. the send button), the loader
animation, and selected card outlines. Defaults to black/white so that
setting a brand accent produces a clearly visible change.

##### accent20

```ts
accent20: string;
```

Accent color with 20% opacity

##### onAccent

```ts
onAccent: string;
```

Foreground color rendered on top of `accent` (e.g. the send button icon).
If omitted while `accent` is set to a solid color, it is derived
automatically for legible contrast.

##### background

```ts
background: string;
```

The background color of the main Touchpoint interface

##### overlay

```ts
overlay: string;
```

The color of the overlay covering the visible portion of the website when the Touchpoint interface does not cover the full screen

##### warningPrimary

```ts
warningPrimary: string;
```

Primary warning color

##### warningSecondary

```ts
warningSecondary: string;
```

Secondary warning color

##### errorPrimary

```ts
errorPrimary: string;
```

Primary error color

##### errorSecondary

```ts
errorSecondary: string;
```

Secondary error color

##### innerBorderRadius

```ts
innerBorderRadius: string;
```

Inner border radius: used for most buttons

##### outerBorderRadius

```ts
outerBorderRadius: string;
```

Outer border radius: generally used for elements that contain buttons that have inner border radius. Also used by the launch button.

## Modality components

### Ripple

```ts
const Ripple: FC<{
  className?: string;
  style?: CSSProperties;
}>;
```

A ripple effect composed of expanding circles.

---

### Carousel

```ts
const Carousel: FC<{
  className?: string;
  children?: ReactNode;
}>;
```

Renders a carousel of cards.

#### Example

```tsx
import {
  Carousel,
  CustomCard,
  CustomCardImageRow,
  React,
} from "@amazon-connect-touchpoint/web";

const MyCarousel = ({ data }) => (
  <Carousel>
    {data.map((item) => (
      <CustomCard key={item.id}>
        <CustomCardImageRow src={item.image} alt={item.description} />
      </CustomCard>
    ))}
  </Carousel>
);
```

---

### CustomCard

```ts
const CustomCard: FC<{
  className?: string;
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  href?: string;
  newTab?: boolean;
}>;
```

A customizable card component that can function as a button or link.

#### Example

```tsx
import {
  CustomCard,
  CustomCardImageRow,
  CustomCardRow,
  React,
} from "@amazon-connect-touchpoint/web";

const MyCard = ({ data }) => (
  <CustomCard selected={data.active} onClick={() => alert("Card clicked!")}>
    <CustomCardImageRow
      src="https://example.com/image.jpg"
      alt="Example Image"
    />
    <CustomCardRow
      left={<div>Left Content</div>}
      right={<div>Right Content</div>}
      icon={MyIcon}
    />
  </CustomCard>
);
```

---

### CustomCardImageRow

```ts
const CustomCardImageRow: FC<{
  src: string;
  alt?: string;
}>;
```

A row within a CustomCard that displays an image.

---

### CustomCardRow

```ts
const CustomCardRow: FC<{
  left: ReactNode;
  right: ReactNode;
  icon?: Icon;
  className?: string;
}>;
```

A row within a CustomCard that displays left and right content, with an optional centered icon.

#### Example

```tsx
import {
  CustomCardRow,
  Icons,
  BaseText,
  React,
} from "@amazon-connect-touchpoint/web";

const MyCardRow = () => (
  <CustomCardRow
    left={<BaseText>Left Content</BaseText>}
    right={<BaseText>Right Content</BaseText>}
    icon={Icons.ArrowRight}
  />
);
```

---

### DateInput

```ts
const DateInput: FC<{
  onSubmit?: (date) => void;
  className?: string;
}>;
```

A date input

#### Example

```tsx
import { DateInput, React } from "@amazon-connect-touchpoint/web";

const MyDateInput = ({ conversationHandler }) => (
  <DateInput
    onSubmit={(date) => conversationHandler.sendContext({ myDate: date })}
  />
);
```

---

### IconButtonType

```ts
type IconButtonType =
  "main" | "ghost" | "activated" | "coverup" | "error" | "overlay";
```

Represents the different types of icon buttons available in the application.

- `main`: The primary icon button.
- `ghost`: A transparent or less prominent icon button.
- `activated`: An icon button that indicates an active state.
- `coverup`: An icon button used to cover up or mask something.
- `overlay`: An icon button that appears over other content.

---

### IconButton

```ts
const IconButton: FC<{
  onClick?: MouseEventHandler<HTMLButtonElement>;
  label: string;
  className?: string;
  type: IconButtonType;
  Icon: FC<IconProps>;
}>;
```

A button showing only an icon (textual label is provided for accessibility)

#### Example

```tsx
import { IconButton, Icons, React } from "@amazon-connect-touchpoint/web";

const MyIconButton = () => (
  <IconButton
    label="Send message"
    onClick={() => alert("Icon button clicked!")}
    type="main"
    Icon={Icons.ArrowForward}
  />
);
```

---

### TextButton

```ts
const TextButton: FC<{
  onClick?: () => void;
  label: string;
  className?: string;
  type?: "main" | "error" | "ghost";
  Icon: FC<IconProps>;
}>;
```

A button with a visible textual label

#### Example

```tsx
import {
  TextButton,
  ArrowForward,
  React,
} from "@amazon-connect-touchpoint/web";

const MyTextButton = ({ onClickHandler }) => (
  <TextButton onClick={onClickHandler} label="Continue" />
);
```

---

### BaseText

```ts
const BaseText: FC<{
  children: ReactNode;
  faded?: boolean;
  className?: string;
}>;
```

Standard text component with base typography styles applied.

#### Example

```tsx
import { BaseText, React } from "@amazon-connect-touchpoint/web";

const MyText = () => <BaseText faded>This is some standard text.</BaseText>;
```

---

### SmallText

```ts
const SmallText: FC<{
  children: ReactNode;
  className?: string;
}>;
```

Small text component with smaller typography styles applied.

---

### html

```ts
const html: (strings, ...values) => unknown;
```

A tagged literal for creating reactive elements for custom modalities.
It already knows about all Touchpoint UI components, so you can use them directly without the need to import them.
Also very useful when using Touchpoint directly from CDN or in projects without a build step.

#### Parameters

##### strings

`TemplateStringsArray`

##### values

...`any`[]

#### Returns

`unknown`

#### Example

```ts
import { html, Icons } from "@amazon-connect-touchpoint/web";

const MyCustomModality = ({ data, conversationHandler }) =>
  html`<div style="display: flex; gap: 8px;">
    <IconButton
      label="Cancel"
      Icon=${Icons.Close}
      type="ghost"
      onClick=${cancel()}
    />
    <TextButton
      label="Submit"
      Icon=${Icons.ArrowForward}
      type="main"
      onClick=${() => conversationHandler.sendText("Button clicked!")}
    />
  </div>`;
```

---

### CustomModalityComponent

```ts
type CustomModalityComponent<Data> = ComponentType<{
  data: Data;
  conversationHandler: ConnectConversationHandler;
  className?: string;
  renderedAsOverlay?: boolean;
}>;
```

Custom Modalities allow rendering of rich user interfaces directly inside a conversation.
A custom modality component is a React component. It will receive the modality data as a
`data` prop, along with the conversation handler instance to interact with the conversation as
`conversationHandler` prop.

#### Type Parameters

##### Data

`Data`

The type of the modality being rendered by this component.

## Live Sync

### PageState

Internal state that the automatic context maintains.

#### Properties

##### formElements

```ts
formElements: Record<string, Element>;
```

Mapping from form element IDs to their DOM elements

##### links

```ts
links: Record<string, string>;
```

Mapping from link element names to their URLs

##### customActions

```ts
customActions: Map<string, (arg) => void>;
```

Mapping from custom actions to their handlers

---

### LiveSyncContext

LiveSync context information that is sent to the LLM.

#### Properties

##### uri?

```ts
optional uri?: string;
```

Identifier for which page you are currently on. This can be used to filter the relevant KB pages.

##### fields?

```ts
optional fields?: InteractiveElementInfo[];
```

The active form fields, provided by the app (deterministically or via its own page
inspection). Used in conjunction with the Live Sync node's "input" action type.

##### scopes?

```ts
optional scopes?: string[];
```

Scope tags describing the current application scope/state, so the agent knows which of
its Live Sync-node tools and actions are available at this point in the journey (e.g.
narrowing 20 tools / 12 actions down to the few relevant here).

##### destinations?

```ts
optional destinations?: string[];
```

Human readable location names that can be navigated to.

##### actions?

```ts
optional actions?: object[];
```

Custom actions that can be performed.

###### action

```ts
action: string;
```

The name of the action, used to invoke it.

###### description?

```ts
optional description?: string;
```

A short description of the action

###### schema?

```ts
optional schema?: any;
```

A schema for validating the action's input. Should follow the JSON Schema specification.

---

### LiveSyncConnection

Connection details for the Live Sync action socket. Providing these enables
Live Sync: Touchpoint opens the socket and lets the assistant drive the page.

#### Properties

##### deploymentKey

```ts
deploymentKey: string;
```

Deployment key for the Live Sync socket.

##### apiKey

```ts
apiKey: string;
```

API key for the Live Sync socket.

##### contactId?

```ts
optional contactId?: string;
```

Amazon Connect contact ID; sent as `conversationId` on the wire. Optional — when
omitted, Live Sync uses the contact ID from the active chat/voice session (from
StartChatContact / StartWebRTCContact), enabling Live Sync collocated with the page.

Set it explicitly to synchronize a separate contact — most commonly an inbound
**phone call** — to the webpage Touchpoint is installed on, so the caller's voice
conversation can drive this page (pass the phone call's contact ID here).

---

### SendStepParams

Parameters for [TouchpointInstance.sendStep](#sendstep). Script steps authenticate separately
from the deployment-key context channel (the Voice+ Track API), so each call carries its
own workspace, script, and key — they are not part of the Live Sync config.

#### Properties

##### stepId

```ts
stepId: string;
```

The Live Sync script step identifier.

##### scriptId

```ts
scriptId: string;
```

Script / journey ID (sent as `journeyId` in the body).

##### apiKey

```ts
apiKey: string;
```

Script-specific Live Sync API key (sent as the `nlx-api-key` header).

##### context?

```ts
optional context?: Record<string, unknown>;
```

Optional context data to attach to the step.

---

### LiveSyncConfig

```ts
type LiveSyncConfig = LiveSyncConnection &
  | {
  automaticContext?: true;
  navigation?: (action, destination, destinations) => void;
  input?: (fields, pageFields) => void;
  custom?: (action, payload) => void;
  customizeAutomaticContext?: (arg) => object;
}
  | {
  automaticContext: false;
  navigation?: (action, destination?) => void;
  input?: (fields) => void;
  custom?: (action, payload) => void;
};
```

Configuration for Live Sync: the connection details, plus how the assistant
may drive the page (navigation, form filling, custom actions).

---

### LiveSyncCustomAction

During a Live Sync liveSync conversation, you can indicate to the application the availability of
custom actions that the user can invoke.

#### Properties

##### action

```ts
action: string;
```

The name of the action, used to invoke it. Should be unique and descriptive in the context of the LLM.

##### description?

```ts
optional description?: string;
```

A short description of the action, used to help the LLM understand its purpose.

If omitted, then the action will not be sent to the application and must be triggered
from the application side.

##### schema?

```ts
optional schema?: any;
```

A JSON Schema that defines the structure of the action's input.

Use descriptive names and `description` fields to give the underlying LLM plenty of context for
it to generate reasonable parameters. Note that the LLM output will be validated (and transformed)
with this schema, so you are guaranteed type safe inputs to your handler.

Should follow the JSONSchema specification.

##### input?

```ts
optional input?: any;
```

Any additional input data that the LLM should have.

##### handler

```ts
handler: (value) => void;
```

A handler that will be called with an argument matching the schema when the action is invoked.

###### Parameters

###### value

`any`

###### Returns

`void`

---

### InteractiveElementInfo

Accessibility information with ID

#### Indexable

```ts
[key: string]: any
```

#### Properties

##### id

```ts
id: string;
```

Form element ID (assigned by the analysis logic, not necessarily equal to the DOM ID)

---

### PageForms

Page forms with elements

#### Properties

##### context

```ts
context: InteractiveElementInfo[];
```

Page context

##### formElements

```ts
formElements: Record<string, Element>;
```

Form element references

---

### analyzePageForms()

```ts
function analyzePageForms(): PageForms;
```

Analyze page forms

#### Returns

[`PageForms`](#pageforms)

Context and state about all the form elements detected on the page using accessibility APIs.

## Other

### ChatDetails

Chat details

#### Properties

##### contactId

```ts
contactId: string;
```

The contact ID

##### participantId

```ts
participantId: string;
```

The participant ID

##### participantToken

```ts
participantToken: string;
```

The participant token used for authentication

---

### DetailsRequestParams

Parameters to pass when calling the `startChatEndpoint`.

#### Extended by

- [`ConnectConfig`](#connectconfig)

#### Properties

##### instanceId?

```ts
optional instanceId?: string;
```

Connect instance ID

##### contactFlowId?

```ts
optional contactFlowId?: string;
```

Contact flow ID to use

##### participantDisplayName?

```ts
optional participantDisplayName?: string;
```

Customer display name

##### contactAttributes?

```ts
optional contactAttributes?: Record<string, string>;
```

Contact attributes passed to the contact flow

##### supportedMessagingContentTypes?

```ts
optional supportedMessagingContentTypes?: string[];
```

Content types the chat participant supports receiving.
Defaults to text/plain, text/markdown, application/json, and interactive messages.

## Utilities

### version

```ts
const version: string = packageJson.version;
```

Package version
