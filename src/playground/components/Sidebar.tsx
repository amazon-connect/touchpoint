import clsx from "clsx";
import { type FC } from "react";
import { SECTIONS } from "../sections";

/**
 * Section navigation, pinned beside the guide. Hidden on narrow viewports,
 * where the guide reads as a single column.
 */
export const Sidebar: FC<{
  /** Id of the section currently in view. */
  activeId: string | null;
}> = ({ activeId }) => (
  <nav aria-label="Sections" className="sticky top-[76px] hidden pr-6 md:block">
    {SECTIONS.map((section) => (
      <a
        key={section.id}
        href={`#${section.id}`}
        aria-current={activeId === section.id ? "true" : undefined}
        className={clsx(
          "block rounded-xl px-4 py-2.5 no-underline transition-colors",
          section.group === true ? "mt-1.5 text-[15px]" : "text-sm",
          activeId === section.id
            ? "bg-sidebar-active font-semibold text-heading"
            : "text-muted hover:text-heading",
        )}
      >
        {/* Capabilities nested under Live Sync get a ↳ branch marker; the marker
            itself provides the visual nesting, so no extra indent. */}
        {section.group !== true && (
          <span aria-hidden="true" className="mr-2 opacity-50">
            ↳
          </span>
        )}
        {section.navLabel}
      </a>
    ))}
  </nav>
);
