import clsx from "clsx";
import { type FC, type ReactNode } from "react";
import { renderInline } from "../inline";
import { BulbIcon, CheckIcon, MicIcon } from "./icons";

/** Muted advice box: a bold lead-in with a lightbulb, then the guidance. */
export const Callout: FC<{
  /** Bold lead-in, e.g. `When to use`. */
  label: string;
  /** Body copy. */
  children: ReactNode;
}> = ({ label, children }) => (
  <div className="my-3 rounded-xl bg-surface px-4 py-3.5 text-sm text-muted">
    <p className="mb-0.5 flex items-center gap-1.5 font-semibold text-heading">
      <BulbIcon />
      {label}
    </p>
    <p className="italic">{children}</p>
  </div>
);

/** A prompt the visitor can speak to the assistant. */
export const SayPrompt: FC<{
  /** The phrase to say. */
  children: string;
}> = ({ children }) => (
  <p className="my-2 flex items-center gap-2 rounded-[10px] bg-accent-tint px-3.5 py-2.5 text-sm text-fg">
    <span className="shrink-0 text-accent">
      <MicIcon />
    </span>
    <span className="italic">
      <span className="font-bold not-italic text-accent">Say: </span>
      {children}
    </span>
  </p>
);

/** Inline outcome of an in-guide action: neutral by default, green on success. */
export const StatusMessage: FC<{
  /** Message text; nothing renders when empty. */
  children?: string;
  /** Renders the green success treatment with a checkmark. */
  success?: boolean;
}> = ({ children, success = false }) => {
  if (children == null || children === "") {
    return null;
  }
  return (
    <p
      className={clsx(
        "text-sm",
        success
          ? "inline-flex items-center gap-1.5 rounded-lg bg-success-bg px-3.5 py-2 font-semibold text-success-fg"
          : "text-muted",
      )}
    >
      {success && <CheckIcon />}
      {children}
    </p>
  );
};

/** Bordered panel used to frame a small read-only demo readout. */
export const Panel: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="mt-4 rounded-xl border border-line bg-card p-4">
    {children}
  </div>
);

/** Sub-section heading inside the launch form. */
export const GroupTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <h2 className="mb-3 mt-7 text-base font-semibold text-heading">{children}</h2>
);

/** Horizontal rule between groups of fields. */
export const GroupDivider: FC = () => (
  <hr className="mb-6 mt-8 border-t border-line" />
);

/** Paragraph of guide prose, authored as inline Markdown. */
export const Prose: FC<{
  /** Inline-Markdown source. */
  text: string;
}> = ({ text }) => <p className="mb-4 mt-2 text-fg">{renderInline(text)}</p>;
