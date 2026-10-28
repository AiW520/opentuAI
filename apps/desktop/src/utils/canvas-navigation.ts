const PREFERENCE_KEY = 'opentu-desktop-last-canvas-v1';
const WORKFLOW_NAVIGATION = 'opentu:workflow-navigation';

function isWorkflowPath(path: string): boolean {
  return path === '/workflow' || path.startsWith('/workflow/');
}

function readPreference(): { path: string; returnUrl?: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(PREFERENCE_KEY) || 'null');
    if (!value || typeof value.path !== 'string') return null;
    const url = new URL(value.path, window.location.origin);
    if (url.origin !== window.location.origin || !isWorkflowPath(url.pathname)) return null;
    const returnUrl = typeof value.returnUrl === 'string' &&
      (value.returnUrl === '/' || value.returnUrl.startsWith('/?'))
      ? value.returnUrl : '/';
    return { path: url.pathname + url.search + url.hash, returnUrl };
  } catch {
    return null;
  }
}

function rememberCurrentCanvas(): void {
  try {
    if (isWorkflowPath(window.location.pathname)) {
      const path = window.location.pathname + window.location.search + window.location.hash;
      localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ path, returnUrl: window.history.state?.workflowReturnUrl }));
    } else {
      localStorage.removeItem(PREFERENCE_KEY);
    }
  } catch {
    // Navigation remains usable when local storage is unavailable.
  }
}

export function initializeDesktopCanvasNavigation(): void {
  const preference = readPreference();
  const location = window.location;
  if (preference && (location.pathname === '/' || location.pathname === '/index.html') && !location.search && !location.hash) {
    window.history.replaceState({ ...window.history.state, workflowReturnUrl: preference.returnUrl }, '', preference.path);
  }
  window.addEventListener(WORKFLOW_NAVIGATION, rememberCurrentCanvas);
  window.addEventListener('popstate', rememberCurrentCanvas);
  rememberCurrentCanvas();
}
