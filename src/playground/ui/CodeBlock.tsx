import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { highlightJs } from "../highlight";
import { CopyIcon } from "./icons";

/**
 * Copies text to the clipboard, briefly confirming in place. Silently does
 * nothing where the clipboard is unavailable (e.g. a non-secure context).
 */
const useCopy = (): [boolean, (text: string) => void] => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1300);
      },
      () => {
        /* clipboard unavailable */
      },
    );
  }, []);

  return [copied, copy];
};

/** Text button that copies the guide as Markdown, confirming in place. */
export const CopyMarkdownButton: FC<{
  /** Produces the Markdown at click time, so it reflects the current state. */
  getMarkdown: () => string;
}> = ({ getMarkdown }) => {
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      title="Copy this guide as Markdown for an LLM"
      onClick={() => {
        copy(getMarkdown());
      }}
      className="shrink-0 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-heading transition-colors hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {copied ? "Copied!" : "Copy as Markdown"}
    </button>
  );
};

/**
 * A syntax-highlighted JavaScript snippet in a titled card with a copy button.
 * Long lines scroll inside the block rather than widening the page.
 */
export const CodeBlock: FC<{
  /** The snippet to display. */
  code: string;
}> = ({ code }) => {
  const [copied, copy] = useCopy();
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-heading">
        <span>JavaScript</span>
        <button
          type="button"
          aria-label="Copy"
          onClick={() => {
            copy(code);
          }}
          className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs text-muted transition-colors hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copied ? "Copied" : <CopyIcon />}
        </button>
      </div>
      <pre className="overflow-x-auto bg-codebg px-4 py-3.5 text-[13px] leading-relaxed">
        <code className="font-mono">{highlightJs(code)}</code>
      </pre>
    </div>
  );
};
