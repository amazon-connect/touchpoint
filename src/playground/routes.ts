/*
  The playground's addresses. A fragment (rather than a path) keeps this a
  single-page app, so a static host such as GitHub Pages serves every page
  without any rewrite rules. Kept free of imports so both the router and the
  pages it renders can read it without an import cycle.
*/

/** Fragment that routes to the component gallery. Specimens live below it. */
export const DESIGN_SYSTEM_ROUTE = "#design-system";

/** A top-level page, as listed in the header. */
export interface Page {
  /** Fragment the link points at. */
  href: string;
  /** Visible label. */
  label: string;
}

/** The top-level pages, in header order. */
export const PAGES: Page[] = [
  { href: "#", label: "Playground" },
  { href: DESIGN_SYSTEM_ROUTE, label: "Design system" },
];

/** Whether a fragment addresses the gallery, or one of its specimens. */
export const isDesignSystemHash = (hash: string): boolean =>
  hash === DESIGN_SYSTEM_ROUTE || hash.startsWith(`${DESIGN_SYSTEM_ROUTE}/`);

/** The page a fragment belongs to, as an entry of {@link PAGES}. */
export const activePageHref = (hash: string): string =>
  isDesignSystemHash(hash) ? DESIGN_SYSTEM_ROUTE : "#";
