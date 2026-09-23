/** @type { import('typedoc').TypeDocOptions & { hideInPageTOC?: boolean, hideBreadcrumbs?: boolean} } */
module.exports = {
  entryPoints: ["./src/index.tsx"],
  hidePageHeader: true,
  hidePageTitle: true,
  hideBreadcrumbs: true,
  formatWithPrettier: true,
  readme: "none",
  out: "docs",
  useCodeBlocks: true,
  plugin: ["typedoc-plugin-markdown"],
  router: "module",
  excludeInternal: true,
  disableSources: true,
  groupOrder: ["Functions", "Variables", "Interfaces", "*"],
  sort: ["source-order", "kind", "instance-first", "alphabetical"],
  categoryOrder: [
    "Basics",
    "Theming",
    "Modality components",
    "Bidirectional Voice+",
    "*",
  ],
  // `ContainerStyle` is derived from the allowlist of CSS properties that backs
  // the runtime check, which is deliberately internal.
  intentionallyNotExported: ["allowedProperties"],
  treatValidationWarningsAsErrors: false,
  treatWarningsAsErrors: false,
  validation: { notExported: true, invalidLink: true, notDocumented: true },
};
