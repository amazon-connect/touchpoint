/* eslint-disable jsdoc/require-jsdoc */
import {
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** Offset in pixels applied to the draggable element via a translate transform. */
export interface DragOffset {
  x: number;
  y: number;
}

/** Props spread onto the drag handle element. */
export interface DragHandleProps {
  onPointerDown: (event: ReactPointerEvent) => void;
  style: { touchAction: "none" };
  "aria-label": string;
}

export interface Draggable {
  /** Ref for the element being moved (used to measure bounds). */
  ref: RefObject<HTMLDivElement>;
  /** Current translate offset. */
  offset: DragOffset;
  /** Whether a drag is in progress. */
  dragging: boolean;
  /** Spread onto the drag handle. */
  handleProps: DragHandleProps;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Lets the user reposition a fixed-positioned element by dragging a handle.
 *
 * The element keeps its CSS anchor (e.g. bottom-right); this hook only applies a
 * translate offset, clamped so the element stays fully within the viewport. Uses
 * pointer events so mouse and touch both work; `touchAction: none` on the handle
 * prevents the page from scrolling mid-drag.
 */
export const useDraggable = (margin = 8): Draggable => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: ReactPointerEvent): void => {
    // Ignore secondary buttons; only start on primary press.
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }
    const el = ref.current;
    const rect = el?.getBoundingClientRect();
    // Base position with the current offset removed, so clamping is absolute.
    const baseLeft = rect != null ? rect.left - offset.x : 0;
    const baseTop = rect != null ? rect.top - offset.y : 0;
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;
    const startX = event.clientX;
    const startY = event.clientY;
    const startOffset = offset;

    setDragging(true);

    const onMove = (moveEvent: globalThis.PointerEvent): void => {
      const nextX = clamp(
        startOffset.x + (moveEvent.clientX - startX),
        margin - baseLeft,
        window.innerWidth - margin - width - baseLeft,
      );
      const nextY = clamp(
        startOffset.y + (moveEvent.clientY - startY),
        margin - baseTop,
        window.innerHeight - margin - height - baseTop,
      );
      setOffset({ x: nextX, y: nextY });
    };

    const onUp = (): void => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return {
    ref,
    offset,
    dragging,
    handleProps: {
      onPointerDown,
      style: { touchAction: "none" },
      "aria-label": "Drag to move",
    },
  };
};
