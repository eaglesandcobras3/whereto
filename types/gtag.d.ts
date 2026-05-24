export {};

declare global {
  interface Window {
    /** Google **`gtag.js`** measurement queue */
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
