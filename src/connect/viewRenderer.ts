/**
 * Loads Amazon Connect's StargateViewRenderer web component from a Connect instance and
 * registers the `<connect-view-renderer>` custom element used to render Views / Guides.
 *
 * The script is served by the instance at
 * `{instanceUrl}/connectwidget/static/views/renderer/latest/index.js` and self-registers the
 * element on load. This loader is idempotent: the script is injected at most once and all
 * callers await the same load.
 */

const VIEW_RENDERER_ELEMENT = "connect-view-renderer";

let loadPromise: Promise<void> | null = null;

/**
 * Composes the renderer script URL from a Connect instance URL (with or without protocol).
 * @param instanceUrl - the Connect instance URL, e.g. `your-instance.my.connect.aws`
 * @returns the fully-qualified renderer script URL
 */
export const viewRendererScriptUrl = (instanceUrl: string): string => {
  const withProtocol = /^https?:\/\//.test(instanceUrl)
    ? instanceUrl
    : `https://${instanceUrl}`;
  const base = withProtocol.replace(/\/+$/, "");
  return `${base}/connectwidget/static/views/renderer/latest/index.js`;
};

/**
 * Loads the Connect view renderer from the given instance URL, resolving once
 * `<connect-view-renderer>` is defined.
 * @param instanceUrl - the Connect instance URL to load the renderer from
 * @returns a promise that resolves when the custom element is registered
 */
export const loadViewRenderer = (instanceUrl: string): Promise<void> => {
  if (typeof window === "undefined" || typeof customElements === "undefined") {
    return Promise.reject(
      new Error("The Connect view renderer requires a browser environment."),
    );
  }
  if (customElements.get(VIEW_RENDERER_ELEMENT) != null) {
    return Promise.resolve();
  }
  if (loadPromise != null) {
    return loadPromise;
  }

  const src = viewRendererScriptUrl(instanceUrl);
  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      customElements.whenDefined(VIEW_RENDERER_ELEMENT).then(() => {
        resolve();
      }, reject);
    };
    script.onerror = () => {
      // Allow a retry on a later guide if this load failed.
      loadPromise = null;
      reject(new Error(`Failed to load the Connect view renderer from ${src}`));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
};
