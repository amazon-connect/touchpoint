import clsx from "clsx";
import { type FC, useEffect, useState } from "react";
import type { ColorMode } from "../../interface";
import { TopBar } from "../components/TopBar";
import { useTheme } from "../theme";
import { Segmented, type SegmentedOption } from "../ui/Segmented";
import { LibrarySurface } from "./LibrarySurface";
import { SPECIMENS } from "./specimens";

/** Color modes offered for the demo surface. */
type SurfaceMode = Extract<ColorMode, "light" | "dark">;

const MODES: SegmentedOption<SurfaceMode>[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const MODE_KEY = "touchpoint-colorMode";

const specimenFromHash = (): string => {
  const id = window.location.hash.replace(/^#/, "");
  return SPECIMENS.some((specimen) => specimen.id === id)
    ? id
    : SPECIMENS[0].id;
};

const readStoredMode = (): SurfaceMode => {
  try {
    return sessionStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light";
  } catch (_e) {
    return "light";
  }
};

/**
 * Developer-facing gallery of the library's UI components, at `/design-system`.
 * Unlinked on purpose: it exists for whoever types the URL, so the playground
 * itself stays a single-purpose page.
 *
 * The components render in a shadow root (see {@link LibrarySurface}) with their
 * own color mode, independent of the page's light/dark theme.
 */
export const DesignSystem: FC = () => {
  const [theme, setTheme] = useTheme();
  const [activeId, setActiveId] = useState(specimenFromHash);
  const [mode, setMode] = useState<SurfaceMode>(readStoredMode);

  // The hash is the address of a specimen, so back/forward and a pasted link
  // both land on the right one.
  useEffect(() => {
    const onHashChange = (): void => {
      setActiveId(specimenFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(MODE_KEY, mode);
    } catch (_e) {
      /* sessionStorage unavailable */
    }
  }, [mode]);

  const active = SPECIMENS.find((specimen) => specimen.id === activeId);

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
            <a
              key={specimen.id}
              href={`#${specimen.id}`}
              aria-current={specimen.id === activeId ? "page" : undefined}
              className={clsx(
                "rounded-xl px-3 py-2 text-sm no-underline transition-colors",
                specimen.id === activeId
                  ? "bg-sidebar-active font-semibold text-heading"
                  : "text-muted hover:text-heading",
              )}
            >
              {specimen.title}
            </a>
          ))}
        </nav>

        <main className="min-w-0">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-bold tracking-[-0.01em] text-heading">
                {active?.title ?? "Design system"}
              </h1>
              <p className="max-w-[60ch] text-sm text-muted">
                {active?.description}
              </p>
            </div>
            <Segmented
              label="Component color mode"
              value={mode}
              options={MODES}
              onChange={setMode}
            />
          </div>
          {active != null && (
            <LibrarySurface colorMode={mode}>
              {/* Keyed so switching specimens starts each gallery fresh rather
                  than reconciling one into the next. */}
              <active.Component key={active.id} />
            </LibrarySurface>
          )}
        </main>
      </div>
    </>
  );
};
