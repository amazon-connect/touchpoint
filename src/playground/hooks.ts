import { useCallback, useEffect, useRef, useState } from "react";
import { resolveSectionId } from "./sections";

/** The demo form's state — the page the assistant drives via Live Sync. */
export interface DemoState {
  /** Customer's full name. */
  fullName: string;
  /** Customer's email address. */
  email: string;
  /** Selected cabin class. */
  cabin: string;
  /** Selected flight id. */
  flight: string;
  /** Selected trip extras. */
  extras: string[];
  /** Departure date (`YYYY-MM-DD`). */
  departDate: string;
  /** Departure time (`HH:mm`). */
  departTime: string;
  /** Number of items added to the order. */
  orderCount: number;
}

const INITIAL_DEMO_STATE: DemoState = {
  fullName: "",
  email: "",
  cabin: "",
  flight: "",
  extras: [],
  departDate: "",
  departTime: "",
  orderCount: 0,
};

/** Mutations the demo controls and the Live Sync action handlers share. */
export interface DemoActions {
  /**
   * Applies a partial update, ignoring keys whose value is `null`/`undefined` —
   * an action that only resolved some of its arguments leaves the rest alone.
   */
  patch: (patch: Partial<DemoState>) => void;
  /** Adds `quantity` items to the order, defaulting to one. */
  addToOrder: (quantity: unknown) => void;
  /** Checks or unchecks one extra. */
  toggleExtra: (value: string, checked: boolean) => void;
}

/** Demo form state plus the mutations used by both the UI and Live Sync. */
export const useDemoState = (): [DemoState, DemoActions] => {
  const [state, setState] = useState<DemoState>(INITIAL_DEMO_STATE);

  const patch = useCallback((update: Partial<DemoState>) => {
    setState((previous) => {
      const next = { ...previous };
      for (const [key, value] of Object.entries(update)) {
        if (value != null) {
          // Every key of the patch belongs to DemoState, so the write is safe;
          // TypeScript can't narrow the value per key from Object.entries.
          (next as Record<string, unknown>)[key] = value;
        }
      }
      return next;
    });
  }, []);

  const addToOrder = useCallback((quantity: unknown) => {
    const count = Number(quantity);
    setState((previous) => ({
      ...previous,
      orderCount: previous.orderCount + (Number.isFinite(count) ? count : 1),
    }));
  }, []);

  const toggleExtra = useCallback((value: string, checked: boolean) => {
    setState((previous) => ({
      ...previous,
      extras: checked
        ? [...previous.extras, value]
        : previous.extras.filter((extra) => extra !== value),
    }));
  }, []);

  const actionsRef = useRef<DemoActions>({ patch, addToOrder, toggleExtra });
  return [state, actionsRef.current];
};

/** One paper plane in flight across the search runway. */
export interface Plane {
  /** Identity, so React can key it and remove it when it lands. */
  id: number;
  /** Offset from the top of the runway, in pixels. */
  top: number;
  /** Glyph size, in pixels. */
  size: number;
  /** Flight duration, in seconds. */
  duration: number;
}

/** The flight-search animation: planes crossing a runway for a few seconds. */
export interface FlightSearch {
  /** Whether the runway is open. */
  running: boolean;
  /** Planes currently in flight. */
  planes: Plane[];
  /** Starts (or restarts) a search run. */
  search: () => void;
  /** Removes a plane once it has flown off the end. */
  land: (id: number) => void;
}

/**
 * Drives the "Search flights" demo: a steady stream of planes for ~5s, each
 * self-removing when it lands, and the runway collapsing once the last one has.
 */
export const useFlightSearch = (): FlightSearch => {
  const [planes, setPlanes] = useState<Plane[]>([]);
  const [running, setRunning] = useState(false);
  const nextId = useRef(0);
  const launcher = useRef<number | undefined>(undefined);
  const stopTimer = useRef<number | undefined>(undefined);
  const clearTimer = useRef<number | undefined>(undefined);

  const reset = useCallback(() => {
    window.clearInterval(launcher.current);
    window.clearTimeout(stopTimer.current);
    window.clearTimeout(clearTimer.current);
  }, []);

  useEffect(() => reset, [reset]);

  const search = useCallback(() => {
    // Reset any run already in progress.
    reset();
    setPlanes([]);
    setRunning(true);

    const spawn = (): void => {
      setPlanes((previous) => [
        ...previous,
        {
          id: nextId.current++,
          top: Math.round(Math.random() * 26),
          size: 16 + Math.round(Math.random() * 12),
          duration: Number((1.8 + Math.random() * 1.6).toFixed(2)),
        },
      ]);
    };

    spawn();
    launcher.current = window.setInterval(spawn, 320);
    stopTimer.current = window.setTimeout(() => {
      window.clearInterval(launcher.current);
    }, 5000);
    clearTimer.current = window.setTimeout(() => {
      setRunning(false);
      setPlanes([]);
    }, 8600);
  }, [reset]);

  const land = useCallback((id: number) => {
    setPlanes((previous) => previous.filter((plane) => plane.id !== id));
  }, []);

  return { running, planes, search, land };
};

/** Id of the section currently in view, for pinning the sidebar. */
export const useActiveSection = (ids: string[]): string | null => {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element != null) {
        observer.observe(element);
      }
    }
    return () => {
      observer.disconnect();
    };
  }, [ids]);

  return activeId;
};

/**
 * Scrolls to a section by id or by the natural destination name the `navigate`
 * action resolves ("the button example").
 */
export const scrollToSection = (destination: string): void => {
  const id = resolveSectionId(destination);
  if (id == null) {
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};
