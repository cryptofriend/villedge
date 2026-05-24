/**
 * Detect whether the app is running inside the World App in-app webview.
 * World App injects `window.WorldApp` and includes `WorldApp` in the UA.
 */
export function isWorldApp(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /WorldApp/i.test(ua) || typeof (window as any).WorldApp !== 'undefined';
}
