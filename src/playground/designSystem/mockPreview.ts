import { useSyncExternalStore } from "react";
import type { WindowSize } from "../../interface";

/** Which mock widget shell the preview shows. */
export type MockScreen = "text" | "voice" | "voiceMini";

/** The presentations the mock screens preview; a subset of `WindowSize`. */
export type MockWindowSize = Extract<WindowSize, "half" | "full" | "floating">;

/** What the "Mock screens" example drives. */
export interface MockPreview {
  /** The shell being previewed: chat, full-screen voice, or voice mini. */
  screen: MockScreen;
  /** How the shell is presented. Ignored by voice mini. */
  windowSize: MockWindowSize;
  /** Whether the mock is currently on screen. */
  isOpen: boolean;
}

const SCREENS: MockScreen[] = ["text", "voice", "voiceMini"];

const WINDOW_SIZES: MockWindowSize[] = ["half", "full", "floating"];

const SCREEN_KEY = "touchpoint-mockScreen";
const WINDOW_SIZE_KEY = "touchpoint-mockWindowSize";

const pick = <T extends string>(
  raw: string | null,
  allowed: T[],
  fallback: T,
): T => (allowed.includes(raw as T) ? (raw as T) : fallback);

let current: MockPreview = {
  screen: pick(sessionStorage.getItem(SCREEN_KEY), SCREENS, "text"),
  windowSize: pick(
    sessionStorage.getItem(WINDOW_SIZE_KEY),
    WINDOW_SIZES,
    "half",
  ),
  // Never restored: a reload should not drop a full-screen mock over the page.
  isOpen: false,
};

const listeners = new Set<() => void>();

/**
 * Module-level store for the design system's mock screen preview.
 *
 * It lives outside React, like `settingsStore`, because the controls that drive
 * it render in the specimen shadow root while the mock itself renders in
 * another root (see `MockHost`) — a context cannot cross that boundary, but a
 * singleton subscribed to via `useSyncExternalStore` can.
 */
export const mockPreviewStore = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): MockPreview => current,
  /** Applies a partial update, as the mock screen controls do. */
  patch: (changes: Partial<MockPreview>): void => {
    current = { ...current, ...changes };
    sessionStorage.setItem(SCREEN_KEY, current.screen);
    sessionStorage.setItem(WINDOW_SIZE_KEY, current.windowSize);
    for (const listener of listeners) {
      listener();
    }
  },
};

/** Subscribes to the mock screen preview. Safe across React roots. */
export const useMockPreview = (): MockPreview =>
  useSyncExternalStore(
    mockPreviewStore.subscribe,
    mockPreviewStore.getSnapshot,
  );
