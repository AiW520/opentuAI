export interface DesktopUpdateState {
  version: string;
  desktop: true;
  changelog?: string[];
  status: 'ready' | 'downloading' | 'installing' | 'restarting' | 'error';
  progress?: number;
  restartOnly?: boolean;
}

declare global {
  interface Window {
    __OPENTU_DESKTOP_UPDATER_ACTIVE__?: boolean;
    __OPENTU_DESKTOP_UPDATE_EVENT__?: DesktopUpdateState;
  }
}

export function publishDesktopUpdate(state: DesktopUpdateState): void {
  window.__OPENTU_DESKTOP_UPDATE_EVENT__ = state;
  window.dispatchEvent(
    new CustomEvent('sw-update-available', { detail: state })
  );
}
