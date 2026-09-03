import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DesignSystem } from "./designSystem/DesignSystem";
import "./playground.css";

const params = new URLSearchParams(window.location.search);

/**
 * Chat-auth redirect landing: when this page is opened as the hosted-login
 * popup's redirect target (Cognito appends `?code` & `?state`), relay those to
 * the main window and close, instead of re-rendering the playground here.
 * Touchpoint (in the opener) then calls the authentication endpoint.
 */
const isAuthRedirect =
  (params.has("code") || params.has("error")) &&
  window.opener != null &&
  window.opener !== window;

if (isAuthRedirect) {
  try {
    (window.opener as Window).postMessage(
      {
        source: "touchpoint-authentication",
        code: params.get("code") ?? undefined,
        state: params.get("state") ?? undefined,
        error: params.get("error") ?? undefined,
        errorDescription: params.get("error_description") ?? undefined,
      },
      window.location.origin,
    );
  } catch (_e) {
    /* the opener may have navigated away */
  }
  document.body.innerHTML =
    '<div style="font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;padding:24px;text-align:center;color:#111;background:#fff">Signed in. You can close this window.</div>';
  window.close();
} else {
  const root = document.getElementById("root");
  if (root != null) {
    // `/design-system` is a developer-only component gallery, reachable by
    // typing the URL (the dev server falls back to this entry for any path).
    // Nothing in the playground links to it.
    const isDesignSystem = /\/design-system\/?$/.test(window.location.pathname);
    // No StrictMode: its double-mount would create (and tear down) a second
    // Touchpoint instance on launch.
    createRoot(root).render(isDesignSystem ? <DesignSystem /> : <App />);
  }
}
