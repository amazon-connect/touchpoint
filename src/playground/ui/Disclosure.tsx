import clsx from "clsx";
import { type FC, type ReactNode } from "react";
import { ChevronIcon } from "./icons";

/** Collapsible panel for supplementary setup notes and patterns. */
export const Disclosure: FC<{
  /** Always-visible summary line. */
  summary: string;
  /** Panel body, revealed when open. */
  children: ReactNode;
  /** Extra classes for the wrapper. */
  className?: string;
}> = ({ summary, children, className }) => (
  <details
    className={clsx(
      "group mt-4 rounded-xl border border-line bg-card px-4",
      className,
    )}
  >
    <summary className="flex cursor-pointer list-none items-center gap-1.5 py-3.5 font-semibold text-heading [&::-webkit-details-marker]:hidden">
      <span className="text-muted transition-transform duration-150 group-open:rotate-90">
        <ChevronIcon />
      </span>
      {summary}
    </summary>
    <div className="pb-4 text-sm text-fg [&_li]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
      {children}
    </div>
  </details>
);

/** Lead-in sentence at the top of a {@link Disclosure} body. */
export const DisclosureLead: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="mb-2 text-sm text-muted">{children}</p>
);

/** Screenshot inside a {@link Disclosure}, with its caption. */
export const DisclosureFigure: FC<{
  /** Image source. */
  src: string;
  /** Alternative text. */
  alt: string;
  /** Caption shown beneath the image. */
  caption: string;
}> = ({ src, alt, caption }) => (
  <figure className="m-0">
    <img
      src={src}
      alt={alt}
      className="my-1 block h-auto w-full rounded-[10px] border border-line"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
    <figcaption className="mb-3.5 text-xs text-muted">{caption}</figcaption>
  </figure>
);
