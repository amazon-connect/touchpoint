/* eslint-disable jsdoc/require-jsdoc */
export const debug = (message: string, ...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.debug(`[Live Sync] ${message}`, ...args);
};
