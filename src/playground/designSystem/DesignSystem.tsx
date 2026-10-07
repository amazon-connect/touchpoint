import { useKeyboardEvent } from "@react-hookz/web";
import clsx from "clsx";
import { type FC, useCallback } from "react";
import { MockText } from "../../mocks/MockText";
import { MockVoice } from "../../mocks/MockVoice";
import { MockVoiceMini } from "../../mocks/MockVoiceMini";
import { TopBar } from "../components/TopBar";
import { Link, useRouter } from "../Router";
import { DESIGN_SYSTEM_ROUTE } from "../routes";
import { useColorMode } from "../colorMode";
import { useCustomTheme } from "../customTheme";
import { useSettings } from "../settings";
import { CodeBlock } from "../ui/CodeBlock";
import { Disclosure } from "../ui/Disclosure";
import { LibrarySurface } from "./LibrarySurface";
import { mockPreviewStore, useMockPreview } from "./mockPreview";
import { MockHost } from "./MockHost";
import { SPECIMEN_SECTIONS, SPECIMENS } from "./specimens";

const specimenFromHash = (hash: string): string => {
  const id = hash.startsWith(`${DESIGN_SYSTEM_ROUTE}/`)
    ? hash.slice(DESIGN_SYSTEM_ROUTE.length + 1)
    : "";
  return SPECIMENS.some((specimen) => specimen.id === id)
    ? id
    : SPECIMENS[0].id;
};

/**
 * Developer-facing gallery of the library's UI components, at `#design-system`.
 *
 * The components render in a shadow root (see {@link LibrarySurface}), in the
 * color mode matching the page theme — the TopBar switch drives both, so there
 * is one light/dark control on the page.
 *
 * The "Mock screens" example previews the library's top-level widget shells —
 * Text, Voice and Voice mini — launched from that page and rendered over the
 * whole viewport (see {@link MockHost}) until closed (button or Escape).
 */
export const DesignSystem: FC = () => {
  const [colorMode, setColorMode] = useColorMode();
  // The playground's custom color overrides, propagated to the preview frames.
  const customTheme = useCustomTheme();
  // Transcript customizations, edited in the "Chat transcript" example.
  const settings = useSettings();
  // The fragment is the address of a specimen, so back/forward and a pasted
  // link both land on the right one.
  const { hash } = useRouter();
  const activeId = specimenFromHash(hash);

  const active = SPECIMENS.find((specimen) => specimen.id === activeId);

  // The mock screen preview, driven by the "Mock screens" example.
  const mock = useMockPreview();

  const closeMock = useCallback(() => {
    mockPreviewStore.patch({ isOpen: false });
  }, []);

  useKeyboardEvent((event) => event.code === "Escape", closeMock, [closeMock]);

  return (
    <>
      <TopBar theme={colorMode} onThemeChange={setColorMode} />
      {/* Same max width and gutters as the TopBar and the launch form, so the
          header rule lines up with the content below it. */}
      <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-start gap-8 px-4 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:px-5">
        <nav
          aria-label="Design system"
          className="flex flex-wrap gap-1 md:sticky md:top-[84px] md:flex-col"
        >
          {SPECIMEN_SECTIONS.map((section, index) => (
            <div
              key={section.label}
              className={clsx(
                "flex w-full flex-wrap gap-1 md:flex-col",
                index > 0 && "mt-6",
              )}
            >
              <p className="w-full py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {section.label}
              </p>
              {section.specimens.map((specimen) => (
                <Link
                  key={specimen.id}
                  href={`${DESIGN_SYSTEM_ROUTE}/${specimen.id}`}
                  aria-current={specimen.id === activeId ? "page" : undefined}
                  className={clsx(
                    "rounded-xl px-3 py-2 text-sm no-underline transition-colors",
                    specimen.id === activeId
                      ? "bg-sidebar-active text-heading"
                      : "text-muted hover:bg-black/5",
                  )}
                >
                  {specimen.title}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <main className="min-w-0">
          <div className="mb-5">
            <h1 className="text-[26px] font-bold tracking-[-0.01em] text-heading">
              {active?.title ?? "Design system"}
            </h1>
            <p className="max-w-[60ch] text-sm text-muted">
              {active?.description}
            </p>
          </div>
          {/* Keyed so switching specimens starts each gallery fresh rather
              than reconciling one into the next. Entries made of page chrome
              (`surface: "page"`) skip the shadow-root surface. */}
          {active != null &&
            (active.surface === "page" ? (
              <active.Component key={active.id} colorMode={colorMode} />
            ) : (
              <LibrarySurface colorMode={colorMode}>
                <active.Component key={active.id} colorMode={colorMode} />
              </LibrarySurface>
            ))}
          {active?.Snippet != null && (
            // Keyed so the disclosure collapses again when switching specimens.
            // The snippet tracks the live edits, so it always matches the
            // gallery above it.
            <Disclosure
              key={`${active.id}-snippet`}
              summary="How this looks in code"
            >
              <active.Snippet />
            </Disclosure>
          )}
          {active?.code != null && (
            // Keyed so the disclosure collapses again when switching specimens.
            <Disclosure
              key={active.id}
              summary="How to build this in a custom modality"
            >
              <CodeBlock code={active.code} />
            </Disclosure>
          )}
        </main>
      </div>
      <MockHost>
        {mock.isOpen && mock.screen === "text" && (
          <MockText
            embedded={false}
            backgroundDepthLayer={settings.backgroundDepthLayer === "on"}
            colorMode={colorMode}
            theme={customTheme}
            onClose={closeMock}
            windowSize={mock.windowSize}
            userMessageBubble={settings.userMessageBubble === "on"}
            agentMessageBubble={settings.agentMessageBubble === "on"}
            userMessageBubbleStyle={settings.userMessageBubbleStyle}
            agentMessageBubbleStyle={settings.agentMessageBubbleStyle}
            showParticipantInfo={settings.avatars === "on"}
            assistantName={settings.assistantName}
            avatarShape={settings.avatarShape}
          />
        )}
        {mock.isOpen && mock.screen === "voice" && (
          <MockVoice
            embedded={false}
            backgroundDepthLayer={settings.backgroundDepthLayer === "on"}
            colorMode={colorMode}
            theme={customTheme}
            onClose={closeMock}
            windowSize={mock.windowSize}
          />
        )}
        {mock.isOpen && mock.screen === "voiceMini" && (
          <MockVoiceMini
            colorMode={colorMode}
            theme={customTheme}
            onClose={closeMock}
          />
        )}
      </MockHost>
    </>
  );
};
