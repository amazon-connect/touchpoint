import { type ReactNode } from "react";

const TOKEN_RE =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\/\/[^\n]*)|\b([A-Za-z_$][\w$]*)\b(\s*:)|\b(import|from|const|let|var|await|async|return|function|new|type)\b/g;

/**
 * Lightweight JavaScript syntax highlighting: strings, line comments, object
 * keys and a handful of keywords. Deliberately not a parser — just enough to
 * make the snippets on the page readable.
 */
export const highlightJs = (code: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of code.matchAll(TOKEN_RE)) {
    const [whole, str, comment, objectKey, colon, keyword] = match;
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(code.slice(lastIndex, start));
    }
    if (str != null) {
      nodes.push(
        <span key={key++} className="text-tok-str">
          {str}
        </span>,
      );
    } else if (comment != null) {
      nodes.push(
        <span key={key++} className="italic text-tok-com">
          {comment}
        </span>,
      );
    } else if (objectKey != null) {
      nodes.push(
        <span key={key++} className="text-tok-key">
          {objectKey}
        </span>,
        colon,
      );
    } else if (keyword != null) {
      nodes.push(
        <span key={key++} className="text-tok-key">
          {keyword}
        </span>,
      );
    } else {
      nodes.push(whole);
    }
    lastIndex = start + whole.length;
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }
  return nodes;
};
