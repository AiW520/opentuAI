// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initializeDesktopCanvasNavigation } from './canvas-navigation';

const key = 'opentu-desktop-last-canvas-v1';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('desktop canvas navigation', () => {
  it('starts in the free canvas on first use', () => {
    initializeDesktopCanvasNavigation();
    expect(window.location.pathname).toBe('/');
  });

  it('restores the last workflow project and its free canvas return path', () => {
    localStorage.setItem(key, JSON.stringify({ path: '/workflow/canvas/project-1', returnUrl: '/?board=board-1' }));
    initializeDesktopCanvasNavigation();
    expect(window.location.pathname).toBe('/workflow/canvas/project-1');
    expect(window.history.state.workflowReturnUrl).toBe('/?board=board-1');
  });

  it('honors an explicit board link', () => {
    localStorage.setItem(key, JSON.stringify({ path: '/workflow/canvas/project-1' }));
    window.history.replaceState(null, '', '/?board=chosen');
    initializeDesktopCanvasNavigation();
    expect(window.location.search).toBe('?board=chosen');
  });

  it('rejects external saved paths', () => {
    localStorage.setItem(key, JSON.stringify({ path: 'https://example.org/workflow' }));
    initializeDesktopCanvasNavigation();
    expect(window.location.pathname).toBe('/');
  });

  it('remembers switching between canvases', () => {
    initializeDesktopCanvasNavigation();
    window.history.pushState({ workflowReturnUrl: '/?board=a' }, '', '/workflow/canvas');
    window.dispatchEvent(new Event('opentu:workflow-navigation'));
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ path: '/workflow/canvas', returnUrl: '/?board=a' });
    window.history.pushState(null, '', '/?board=a');
    window.dispatchEvent(new Event('opentu:workflow-navigation'));
    expect(localStorage.getItem(key)).toBeNull();
  });
});
