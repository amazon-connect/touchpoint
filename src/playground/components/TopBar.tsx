import clsx from "clsx";
import { type FC, useState } from "react";
import { Link, useRouter } from "../Router";
import { activePageHref, PAGES } from "../routes";
import type { PageTheme } from "../theme";
import { BrandMark, CloseIcon, MenuIcon, MoonIcon, SunIcon } from "../ui/icons";

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

/** The page links, laid out inline in the bar or stacked in the menu. */
const PageLinks: FC<{
  /** Fragment of the page currently shown. */
  activeHref: string;
  /** Called after a link is followed, to dismiss the menu. */
  onNavigate: () => void;
  /** Whether to stack the links (the mobile menu) rather than inline them. */
  stacked?: boolean;
}> = ({ activeHref, onNavigate, stacked = false }) => (
  <>
    {PAGES.map((page) => (
      <Link
        key={page.href}
        href={page.href}
        aria-current={page.href === activeHref ? "page" : undefined}
        onClick={onNavigate}
        className={clsx(
          "rounded-xl px-3 py-2 text-sm no-underline transition-colors",
          stacked && "block",
          page.href === activeHref
            ? "bg-sidebar-active font-semibold text-heading"
            : "text-muted hover:text-heading",
        )}
      >
        {page.label}
      </Link>
    ))}
  </>
);

/**
 * Sticky page header: brand mark on the left, theme switch and page links on
 * the right. Below `md` the links move into a hamburger menu, which takes their
 * place in the bar, leaving room for the brand mark and the theme switch.
 */
export const TopBar: FC<{
  /** Active page theme. */
  theme: PageTheme;
  /** Called with the newly selected theme. */
  onThemeChange: (theme: PageTheme) => void;
}> = ({ theme, onThemeChange }) => {
  const { hash } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeHref = activePageHref(hash);
  const closeMenu = (): void => {
    setMenuOpen(false);
  };

  return (
    <div
      className="sticky top-0 z-20 border-b border-line bg-headerbg backdrop-blur-[10px] backdrop-saturate-150"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          closeMenu();
        }
      }}
    >
      <div className="mx-auto flex max-w-[1080px] items-center gap-2 px-4 py-3 md:px-5">
        <Link
          href="#"
          onClick={closeMenu}
          className="flex items-center gap-2.5 text-[15px] font-bold text-heading no-underline"
        >
          <BrandMark className="block" />
          <span>Touchpoint</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle theme={theme} onChange={onThemeChange} />
          <nav aria-label="Pages" className="hidden items-center gap-1 md:flex">
            <PageLinks activeHref={activeHref} onNavigate={closeMenu} />
          </nav>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="pg-page-menu"
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-heading transition-colors hover:bg-sidebar-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {/* Rendered while closed (rather than dropped) so the button's
          `aria-controls` always resolves; `hidden` keeps it out of the
          accessibility tree, as does `md:hidden` once the bar has room. */}
      <nav
        id="pg-page-menu"
        aria-label="Pages"
        hidden={!menuOpen}
        className="border-t border-line px-4 py-2 md:hidden"
      >
        <PageLinks activeHref={activeHref} onNavigate={closeMenu} stacked />
      </nav>
    </div>
  );
};
