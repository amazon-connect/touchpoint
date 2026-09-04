import { type FC, useState } from "react";
import type { ColorMode } from "../interface";
import { TopBar } from "./components/TopBar";
import { ConfigScreen } from "./screens/ConfigScreen";
import { GuideScreen } from "./screens/GuideScreen";
import {
  type Settings,
  settingsFromParams,
  writeSettingsToUrl,
} from "./settings";
import { useTheme } from "./theme";

/** What the guide needs, captured at launch so later edits can't disturb it. */
interface Launched {
  /** The trimmed configuration the widget was created with. */
  settings: Settings;
  /** Color mode handed to the widget. */
  colorMode: ColorMode;
}

/**
 * The playground: the launch form, then the Live Sync guide with Touchpoint
 * mounted. Configuration is seeded from the URL query string, so a link can
 * carry a whole setup.
 */
export const App: FC = () => {
  const [theme, setTheme] = useTheme();
  const [settings, setSettings] = useState<Settings>(() =>
    settingsFromParams(new URLSearchParams(window.location.search)),
  );
  const [launched, setLaunched] = useState<Launched | null>(null);

  return (
    <>
      <TopBar theme={theme} onThemeChange={setTheme} />
      <div className="mx-auto max-w-[1080px] px-4 pb-30 pt-6 md:px-5 md:pb-40 md:pt-10">
        {launched == null ? (
          <ConfigScreen
            settings={settings}
            onChange={(patch) => {
              setSettings((previous) => ({ ...previous, ...patch }));
            }}
            onLaunch={(trimmed) => {
              setSettings(trimmed);
              writeSettingsToUrl(trimmed);
              setLaunched({
                settings: trimmed,
                // Contrast the widget against the page: dark page → light
                // widget, and vice versa.
                colorMode: theme === "dark" ? "light" : "dark",
              });
            }}
          />
        ) : (
          <GuideScreen
            settings={launched.settings}
            colorMode={launched.colorMode}
          />
        )}
      </div>
    </>
  );
};
