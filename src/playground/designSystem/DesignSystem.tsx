import { useKeyboardEvent } from "@react-hookz/web";
import clsx from "clsx";
import { type FC, useCallback, useEffect, useState } from "react";
import { type WindowSize } from "../../interface";
import { MockText } from "../../mocks/MockText";
import { MockVoice } from "../../mocks/MockVoice";
import { MockVoiceMini } from "../../mocks/MockVoiceMini";
import { TopBar } from "../components/TopBar";
import { Link, useRouter } from "../Router";
import { DESIGN_SYSTEM_ROUTE } from "../routes";
import { useTheme } from "../theme";
import { Segmented } from "../ui/Segmented";
import { LibrarySurface } from "./LibrarySurface";
import { MockHost } from "./MockHost";
import { SPECIMENS } from "./specimens";

const specimenFromHash = (hash: string): string => {
  const id = hash.startsWith(`${DESIGN_SYSTEM_ROUTE}/`)
    ? hash.slice(DESIGN_SYSTEM_ROUTE.length + 1)
    : "";
  return SPECIMENS.some((specimen) => specimen.id === id)
    ? id
    : SPECIMENS[0].id;
};

/** Which mock chat frame the floating preview shows. */
type MockVersion = "mock1" | "mock2" | "mock3";

const MOCK_OPTIONS: { value: MockVersion; label: string }[] = [
  { value: "mock1", label: "Text" },
  { value: "mock2", label: "Voice" },
  { value: "mock3", label: "Voice mini" },
];

const WINDOW_SIZE_OPTIONS: { value: WindowSize; label: string }[] = [
  { value: "half", label: "Half" },
  { value: "full", label: "Full" },
];

/**
 * Developer-facing gallery of the library's UI components, at `#design-system`.
 *
 * The components render in a shadow root (see {@link LibrarySurface}), in the
 * color mode matching the page theme — the TopBar switch drives both, so there
 * is one light/dark control on the page.
 *
 * A floating mock chat frame (see {@link MockHost}) previews the library's
 * top-level widget shell — Text, Voice and Voice-mini — independent of which
 * specimen is showing, switchable from the sidebar or the 1/2/3 keys.
 */
export const DesignSystem: FC = () => {
  const [theme, setTheme] = useTheme();
  // The fragment is the address of a specimen, so back/forward and a pasted
  // link both land on the right one.
  const { hash } = useRouter();
  const activeId = specimenFromHash(hash);

  const active = SPECIMENS.find((specimen) => specimen.id === activeId);

  const [activeMock, setActiveMock] = useState<MockVersion>(() => {
    const stored = sessionStorage.getItem("touchpoint-activeMock");
    return stored === "mock1" || stored === "mock2" || stored === "mock3"
      ? stored
      : "mock1";
  });

  useEffect(() => {
    sessionStorage.setItem("touchpoint-activeMock", activeMock);
  }, [activeMock]);

  const [isMockExpanded, setIsMockExpanded] = useState<boolean>(() => {
    return sessionStorage.getItem("touchpoint-isMockExpanded") === "true";
  });

  useEffect(() => {
    sessionStorage.setItem(
      "touchpoint-isMockExpanded",
      String(isMockExpanded),
    );
  }, [isMockExpanded]);

  const [windowSize, setWindowSize] = useState<WindowSize>(() => {
    const stored = sessionStorage.getItem("touchpoint-windowSize");
    return stored === "half" || stored === "full" ? stored : "half";
  });

  useEffect(() => {
    sessionStorage.setItem("touchpoint-windowSize", windowSize);
  }, [windowSize]);

  const expandMock = useCallback(() => {
    setIsMockExpanded(true);
  }, []);

  const collapseMock = useCallback(() => {
    setIsMockExpanded(false);
  }, []);

  const toggleMock = useCallback(() => {
    setIsMockExpanded((prev) => !prev);
  }, []);

  useKeyboardEvent(
    (event) => event.code === "Digit1",
    () => {
      setActiveMock("mock1");
    },
    [],
  );

  useKeyboardEvent(
    (event) => event.code === "Digit2",
    () => {
      setActiveMock("mock2");
    },
    [],
  );

  useKeyboardEvent(
    (event) => event.code === "Digit3",
    () => {
      setActiveMock("mock3");
    },
    [],
  );

  useKeyboardEvent(
    (event) => event.code === "Space",
    () => {
      if (activeMock !== "mock3") {
        setWindowSize((prev) => (prev === "half" ? "full" : "half"));
      }
    },
    [activeMock],
  );

  useKeyboardEvent((event) => event.code === "Enter", toggleMock, [
    toggleMock,
  ]);

  useKeyboardEvent((event) => event.code === "Escape", collapseMock, [
    collapseMock,
  ]);

  return (
    <>
      <TopBar theme={theme} onThemeChange={setTheme} />
      {/* Same max width and gutters as the TopBar and the launch form, so the
          header rule lines up with the content below it. */}
      <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-start gap-8 px-4 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:px-5">
        <nav
          aria-label="Components"
          className="flex flex-wrap gap-1 md:sticky md:top-[84px] md:flex-col"
        >
          <p className="w-full text-xs font-semibold uppercase tracking-wide text-muted">
            Components
          </p>
          {SPECIMENS.map((specimen) => (
            <Link
              key={specimen.id}
              href={`${DESIGN_SYSTEM_ROUTE}/${specimen.id}`}
              aria-current={specimen.id === activeId ? "page" : undefined}
              className={clsx(
                "rounded-xl px-3 py-2 text-sm no-underline transition-colors",
                specimen.id === activeId
                  ? "bg-sidebar-active font-semibold text-heading"
                  : "text-muted hover:text-heading",
              )}
            >
              {specimen.title}
            </Link>
          ))}
          <div className="w-full space-y-4 border-t border-line pt-4">
            <div className="w-full space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Chat frame
              </p>
              <Segmented
                label="Chat frame"
                value={activeMock}
                options={MOCK_OPTIONS}
                onChange={setActiveMock}
              />
              <p className="text-xs text-muted">or press 1, 2, 3</p>
            </div>
            {activeMock !== "mock3" && (
              <div className="w-full space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Window size
                </p>
                <Segmented
                  label="Window size"
                  value={windowSize}
                  options={WINDOW_SIZE_OPTIONS}
                  onChange={setWindowSize}
                />
                <p className="text-xs text-muted">or press space</p>
              </div>
            )}
          </div>
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
          {active != null && (
            <LibrarySurface colorMode={theme}>
              {/* Keyed so switching specimens starts each gallery fresh rather
                  than reconciling one into the next. */}
              <active.Component key={active.id} />
            </LibrarySurface>
          )}
        </main>
      </div>
      <MockHost>
        {activeMock === "mock1" && (
          <MockText
            embedded={false}
            colorMode={theme}
            isExpanded={isMockExpanded}
            onExpand={expandMock}
            onClose={collapseMock}
            windowSize={windowSize}
          />
        )}
        {activeMock === "mock2" && (
          <MockVoice
            embedded={false}
            colorMode={theme}
            isExpanded={isMockExpanded}
            onExpand={expandMock}
            onClose={collapseMock}
            windowSize={windowSize}
          />
        )}
        {activeMock === "mock3" && (
          <MockVoiceMini
            colorMode={theme}
            isExpanded={isMockExpanded}
            onExpand={expandMock}
            onClose={collapseMock}
          />
        )}
      </MockHost>
    </>
  );
};
