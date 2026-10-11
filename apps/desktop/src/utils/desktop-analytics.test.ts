import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('./tauri-api', () => ({
  isTauriEnvironment: () => !!(window as any).__TAURI_INTERNALS__,
}));

import {
  initializeDesktopAnalytics,
  prepareDesktopAnalyticsPayload,
} from './desktop-analytics';
import { analytics } from '../../../../packages/drawnix/src/utils/umami-analytics';

describe('desktop Umami integration', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false);
    (window as any).__TAURI_INTERNALS__ = {};
    window.history.replaceState({}, '', '/local/board?token=secret#private');
    const meta = document.createElement('meta');
    meta.name = 'app-version';
    meta.content = '1.2.12';
    document.head.appendChild(meta);
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
    delete window.umami;
    delete window.__OPENTU_DESKTOP_ANALYTICS_READY__;
    delete window.__OPENTU_DESKTOP_UMAMI_BEFORE_SEND__;
    document.querySelector('#opentu-desktop-umami')?.remove();
    document.querySelector('meta[name="app-version"]')?.remove();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('does not record browser previews or development builds', () => {
    delete (window as any).__TAURI_INTERNALS__;
    initializeDesktopAnalytics();
    expect(document.querySelector('#opentu-desktop-umami')).toBeNull();
    (window as any).__TAURI_INTERNALS__ = {};
    vi.stubEnv('DEV', true);
    initializeDesktopAnalytics();
    expect(document.querySelector('#opentu-desktop-umami')).toBeNull();
  });

  it('loads the configured SDK once and records exactly one launch pageview', async () => {
    initializeDesktopAnalytics();
    initializeDesktopAnalytics();
    const scripts = document.querySelectorAll<HTMLScriptElement>('#opentu-desktop-umami');
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe('https://umami.tu-zi.com/script.js');
    expect(scripts[0].dataset).toMatchObject({
      websiteId: 'e6bd249e-bc68-4857-b6a5-02131b4ea286',
      beforeSend: '__OPENTU_DESKTOP_UMAMI_BEFORE_SEND__',
      autoTrack: 'false', excludeSearch: 'true', excludeHash: 'true',
    });
    const track = vi.fn();
    window.umami = { track };
    scripts[0].dispatchEvent(new Event('load'));
    await window.__OPENTU_DESKTOP_ANALYTICS_READY__;
    expect(track).toHaveBeenCalledExactlyOnceWith();
  });

  it('normalizes visits and business events without sending the local URL or title', () => {
    const payload = prepareDesktopAnalyticsPayload('event', {
      website: 'website-id', url: window.location.href,
      referrer: 'file:///Users/private', title: 'Private board',
      data: { model: 'gpt-image-2', hostname: 'localhost' },
    });
    expect(payload).toMatchObject({
      website: 'website-id', hostname: 'desktop.opentu.ai',
      url: 'https://desktop.opentu.ai/desktop', referrer: '',
      title: 'OpenTu Desktop', tag: 'desktop',
      data: { model: 'gpt-image-2', client_type: 'desktop',
        app_version: '1.2.12', hostname: 'desktop.opentu.ai',
        route_name: '/desktop', deployment_env: 'production' },
    });
    expect(JSON.stringify(payload)).not.toMatch(/secret|private|localhost/);
  });

  it('delivers shared business events that occur while the SDK is loading', async () => {
    initializeDesktopAnalytics();
    const pending = analytics.track('image_generation_success', { model: 'gpt-image-2' });
    const track = vi.fn();
    window.umami = { track };
    document.querySelector('#opentu-desktop-umami')!.dispatchEvent(new Event('load'));
    await pending;
    expect(track).toHaveBeenCalledWith('image_generation_success', expect.objectContaining({
      client_type: 'desktop', route_name: '/desktop', model: 'gpt-image-2',
    }));
  });

  it('settles queued events on SDK failure and timeout', async () => {
    initializeDesktopAnalytics();
    const pending = analytics.track('image_generation_start');
    document.querySelector('#opentu-desktop-umami')!.dispatchEvent(new Event('error'));
    await expect(pending).resolves.toBeUndefined();
    delete window.__OPENTU_DESKTOP_ANALYTICS_READY__;
    document.querySelector('#opentu-desktop-umami')!.remove();
    vi.useFakeTimers();
    initializeDesktopAnalytics();
    const timeoutEvent = analytics.track('image_generation_start');
    await vi.advanceTimersByTimeAsync(8000);
    await expect(timeoutEvent).resolves.toBeUndefined();
  });

  it('allows only the configured analytics script origin in the native CSP', () => {
    const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
    const directive = config.app.security.csp.split(';').find((part: string) => part.trim().startsWith('script-src'));
    expect(directive.trim()).toBe("script-src 'self' https://umami.tu-zi.com");
  });
});
