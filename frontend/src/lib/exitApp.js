/**
 * Exit menu item. In the Windows desktop app (Phase 13) Electron's preload script exposes
 * window.vira.exit(); in a plain browser tab there is nothing to close except the tab itself.
 * Returns true when the app asked its host to close.
 */
export function exitApp() {
  if (typeof window !== 'undefined' && typeof window.vira?.exit === 'function') {
    window.vira.exit();
    return true;
  }
  window.close();
  return false;
}
