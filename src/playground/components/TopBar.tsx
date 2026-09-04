import clsx from "clsx";
import { type FC } from "react";
import type { PageTheme } from "../theme";
import { BrandMark, MoonIcon, SunIcon } from "../ui/icons";

const THEMES: { value: PageTheme; label: string; icon: FC }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

/** Light/dark switch for the page (independent of the widget's color mode). */
const ThemeToggle: FC<{
  /** Active theme. */
  theme: PageTheme;
  /** Called with the newly selected theme. */
  onChange: (theme: PageTheme) => void;
}> = ({ theme, onChange }) => (
  <div
    role="group"
    aria-label="Theme"
    className="flex gap-0.5 rounded-full border border-line bg-surface p-[3px]"
  >
    {THEMES.map(({ value, label, icon: Icon }) => (
      <button
        key={value}
        type="button"
        aria-label={label}
        aria-pressed={theme === value}
        title={label}
        onClick={() => {
          onChange(value);
        }}
        className={clsx(
          "flex h-[26px] w-[38px] items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          theme === value
            ? "bg-card text-heading shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
            : "text-muted hover:text-heading",
        )}
      >
        <Icon />
      </button>
    ))}
  </div>
);

/** Sticky page header: brand mark on the left, theme switch on the right. */
export const TopBar: FC<{
  /** Active page theme. */
  theme: PageTheme;
  /** Called with the newly selected theme. */
  onThemeChange: (theme: PageTheme) => void;
}> = ({ theme, onThemeChange }) => (
  <div className="sticky top-0 z-20 border-b border-line bg-headerbg backdrop-blur-[10px] backdrop-saturate-150">
    <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-4 py-3 md:px-5">
      <div className="flex items-center gap-2.5 text-[15px] font-bold text-heading">
        <BrandMark className="block" />
        <span>Touchpoint</span>
      </div>
      <ThemeToggle theme={theme} onChange={onThemeChange} />
    </div>
  </div>
);
