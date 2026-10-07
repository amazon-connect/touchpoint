import clsx from "clsx";
import { type FC, useState } from "react";
import type { ColorMode } from "../../interface";
import { Link, useRouter } from "../Router";
import { activePageHref, PAGES } from "../routes";
import { BrandMark, CloseIcon, MenuIcon, MoonIcon, SunIcon } from "../ui/icons";
import { Segmented, type SegmentedOption } from "../ui/Segmented";

const THEMES: SegmentedOption<ColorMode>[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

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
  theme: ColorMode;
  /** Called with the newly selected theme. */
  onThemeChange: (theme: ColorMode) => void;
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
          {/* Light/dark switch for the page, independent of the widget's own
              color mode. */}
          <Segmented
            label="Theme"
            value={theme}
            options={THEMES}
            onChange={onThemeChange}
            variant="icons"
          />
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
