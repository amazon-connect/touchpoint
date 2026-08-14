/* eslint-disable jsdoc/require-jsdoc */
import { clsx } from "clsx";
import { type FC, useEffect, useRef, useState } from "react";

import { type ResolvedView, loadViewRenderer } from "../../connect";
import { useCopy } from "../../utils/useCopy";
import { Guide, Close } from "./Icons";
import { IconButton } from "./IconButton";

/**
 * A reference to an Amazon Connect View/Guide, as delivered over the chat transcript.
 * The view definition is not inlined — it is resolved from `viewToken`.
 */
export interface GuideReference {
  viewId?: string;
  viewToken?: string;
  viewData?: unknown;
}

/**
 * The `view` resource passed to the `<connect-view-renderer>` element (as its `view`
 * attribute), assembled from a resolved view plus its runtime input data.
 */
export interface ViewPayload {
  Content: {
    Actions: string[];
    InputSchema: unknown;
    Template: unknown;
  };
  InputData: unknown;
}

/** What a {@link GuideCard} hands up when opened, for the {@link GuideModal} to render. */
export interface OpenGuide {
  title: string;
  viewName?: string;
  view: ViewPayload;
  onComplete: () => void;
}

/** Local (non-protocol) progress state for a guide. */
export type GuideStatus = "notStarted" | "inProgress" | "complete";

const statusStyles: Record<GuideStatus, string> = {
  notStarted: "bg-primary-10 text-primary-60",
  inProgress: "bg-warning-secondary text-warning-primary",
  complete: "bg-accent-20 text-accent",
};

const StatusBadge: FC<{ status: GuideStatus }> = ({ status }) => {
  const copy = useCopy();
  return (
    <span
      className={clsx(
        "flex-none text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
        statusStyles[status],
      )}
    >
      {copy.guide.status[status]}
    </span>
  );
};

/**
 * A compact card in the transcript representing an Amazon Connect View/Guide. It resolves
 * the view definition from the `viewToken` on mount (for its title and the payload the
 * renderer needs) and, when tapped, opens the guide. Progress status is local UI state
 * (not part of the guides protocol).
 */
export const GuideCard: FC<{
  guide: GuideReference;
  onDescribeView?: (viewToken: string) => Promise<ResolvedView | null>;
  onOpen: (guide: OpenGuide) => void;
}> = ({ guide, onDescribeView, onOpen }) => {
  const copy = useCopy();
  const [view, setView] = useState<ResolvedView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);
  const [status, setStatus] = useState<GuideStatus>("notStarted");

  useEffect(() => {
    let cancelled = false;
    if (guide.viewToken == null || onDescribeView == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    onDescribeView(guide.viewToken)
      .then((resolved) => {
        if (cancelled) return;
        if (resolved == null) {
          setFailed(true);
        } else {
          setView(resolved);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guide.viewToken, onDescribeView]);

  const viewData = (guide.viewData ?? {}) as Record<string, any>;
  const template = (view?.template ?? {}) as Record<string, any>;
  const title =
    view?.name ??
    viewData.Heading ??
    template.Head?.Title ??
    copy.guide.defaultTitle;
  const subtitle = viewData.SubHeading ?? copy.guide.defaultSubtitle;

  return (
    <button
      type="button"
      disabled={view == null}
      className={clsx(
        "w-full flex items-center gap-3 p-3 rounded-inner text-left",
        "bg-primary-5 enabled:hover:bg-primary-10 transition-colors",
      )}
      onClick={() => {
        if (view == null) return;
        if (status === "notStarted") {
          setStatus("inProgress");
        }
        onOpen({
          title,
          viewName: view.name,
          view: {
            Content: {
              Actions: view.actions,
              InputSchema: view.inputSchema,
              Template: view.template,
            },
            InputData: guide.viewData ?? {},
          },
          onComplete: () => {
            setStatus("complete");
          },
        });
      }}
    >
      <span className="flex-none w-11 h-11 rounded-inner bg-primary-10 flex items-center justify-center text-primary-60">
        <Guide className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0 space-y-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs text-primary-60 truncate">
            {copy.guide.label}
          </span>
          <StatusBadge status={status} />
        </span>
        {loading ? (
          <span className="block text-base text-primary-40 shimmer w-fit">
            {copy.guide.loading}
          </span>
        ) : failed ? (
          <span className="block text-base text-error-primary">
            {copy.guide.error}
          </span>
        ) : (
          <>
            <span className="block text-base text-primary truncate">
              {title}
            </span>
            {subtitle !== "" ? (
              <span className="block text-sm text-primary-60 truncate">
                {subtitle}
              </span>
            ) : null}
          </>
        )}
      </span>
    </button>
  );
};

/**
 * The full-view modal opened from a {@link GuideCard}. It loads Amazon Connect's view
 * renderer from the instance and hosts the `<connect-view-renderer>` element, forwarding
 * the view's submit action back to the contact flow.
 */
export const GuideModal: FC<{
  title: string;
  view: ViewPayload;
  viewName?: string;
  instanceUrl?: string;
  onSubmit: (action: string, data: unknown, viewName?: string) => void;
  onComplete: () => void;
  onClose: () => void;
}> = ({ title, view, viewName, instanceUrl, onSubmit, onComplete, onClose }) => {
  const copy = useCopy();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  // Keep the latest callbacks in a ref so the element-creation effect below doesn't depend
  // on their (per-render) identities — otherwise a parent re-render would tear down and
  // recreate the renderer, losing the user's in-progress form input.
  const callbacksRef = useRef({ onSubmit, onComplete, onClose });
  callbacksRef.current = { onSubmit, onComplete, onClose };

  useEffect(() => {
    let cancelled = false;
    if (instanceUrl == null || instanceUrl === "") {
      setState("error");
      return;
    }
    loadViewRenderer(instanceUrl)
      .then(() => {
        if (!cancelled) setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [instanceUrl]);

  // Once the renderer is loaded, create the custom element imperatively (avoids typing the
  // element in JSX), feed it the view, and forward its submit action.
  useEffect(() => {
    if (state !== "ready") return;
    const container = containerRef.current;
    if (container == null) return;

    const element = document.createElement("connect-view-renderer");
    element.setAttribute("guideParticipant", "END_CUSTOMER");
    element.setAttribute("interactionMode", "Actual");
    element.setAttribute("locale", "en_US");
    try {
      element.setAttribute("view", JSON.stringify(view));
    } catch {
      /* view payload is expected to be serializable */
    }

    const handleAction = (event: Event): void => {
      const detail = ((event as CustomEvent).detail ?? {}) as {
        Action?: string;
        Output?: unknown;
        Data?: unknown;
      };
      const { onSubmit, onComplete, onClose } = callbacksRef.current;
      onSubmit(detail.Action ?? "", detail.Output ?? detail.Data ?? {}, viewName);
      onComplete();
      onClose();
    };

    element.addEventListener("onAction", handleAction);
    container.appendChild(element);

    return () => {
      element.removeEventListener("onAction", handleAction);
      element.remove();
    };
  }, [state, view, viewName]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-full overflow-y-auto no-scrollbar rounded-outer bg-secondary p-4 space-y-3 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <span className="text-base font-semibold text-primary">{title}</span>
          <IconButton
            className="flex-none"
            type="ghost"
            Icon={Close}
            label={copy.guide.close}
            onClick={onClose}
          />
        </div>
        {state === "loading" ? (
          <p className="text-sm text-primary-40 shimmer w-fit">
            {copy.guide.loading}
          </p>
        ) : null}
        {state === "error" ? (
          <p className="text-sm text-error-primary">{copy.guide.error}</p>
        ) : null}
        <div ref={containerRef} className={state === "ready" ? "" : "hidden"} />
      </div>
    </div>
  );
};
