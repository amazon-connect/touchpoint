import { type ReactNode } from "react";

const INLINE_RE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^\s)]+)\)/g;

/**
 * Renders the small subset of inline Markdown used by the guide copy:
 * `` `code` ``, `**strong**` and `[label](url)`. Prose lives in
 * `sections.ts` as Markdown so the same source feeds both the rendered page and
 * the "Copy as Markdown" export.
 */
export const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE_RE)) {
    const [whole, code, strong, linkLabel, linkHref] = match;
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    if (code != null) {
      nodes.push(
        <code
          key={key++}
          className="whitespace-nowrap rounded-md border border-line bg-surface px-1.5 py-px font-mono text-[0.88em] text-heading"
        >
          {code}
        </code>,
      );
    } else if (strong != null) {
      nodes.push(
        <strong key={key++} className="font-semibold text-heading">
          {strong}
        </strong>,
      );
    } else if (linkLabel != null) {
      nodes.push(
        <a
          key={key++}
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
        >
          {linkLabel}
        </a>,
      );
    } else {
      nodes.push(whole);
    }
    lastIndex = start + whole.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
};
