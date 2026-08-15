// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlaitBoard } from '@plait/core';
import {
  IMAGE_GENERATION_ANCHOR_RETRY_EVENT,
  type PlaitImageGenerationAnchor,
} from '../../types/image-generation-anchor.types';
import { ImageGenerationAnchorGenerator } from './image-generation-anchor.generator';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./ImageGenerationAnchorContent', () => ({
  ImageGenerationAnchorContent: () =>
    React.createElement(
      'div',
      { className: 'image-generation-anchor' },
      '生成中'
    ),
}));

describe('ImageGenerationAnchorGenerator', () => {
  afterEach(() => {
    delete (
      window as Window & {
        __TAURI_INTERNALS__?: unknown;
      }
    ).__TAURI_INTERNALS__;
    document.body.replaceChildren();
  });

  it('mounts React content into an HTML host inside foreignObject', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const parentG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(parentG);
    document.body.appendChild(svg);

    const generator = new ImageGenerationAnchorGenerator({} as PlaitBoard);
    const element = {
      id: 'anchor-1',
      points: [
        [10, 20],
        [210, 140],
      ],
    } as PlaitImageGenerationAnchor;

    await act(async () => {
      generator.processDrawing(element, parentG, false);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const foreignObject = parentG.querySelector('foreignObject');
    const host = foreignObject?.querySelector('.image-generation-anchor-host');

    expect(foreignObject).not.toBeNull();
    expect(host).toBeInstanceOf(HTMLDivElement);
    expect(host?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    expect(host?.querySelector('.image-generation-anchor')?.textContent).toBe(
      '生成中'
    );

    await act(async () => {
      generator.destroy();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    svg.remove();
  });

  it('renders a native SVG status card in Tauri instead of foreignObject', () => {
    (
      window as Window & {
        __TAURI_INTERNALS__?: unknown;
      }
    ).__TAURI_INTERNALS__ = {};

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const parentG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(parentG);
    document.body.appendChild(svg);

    const deleteFragment = vi.fn();
    const generator = new ImageGenerationAnchorGenerator({
      deleteFragment,
    } as unknown as PlaitBoard);
    const element = {
      id: 'anchor-desktop',
      type: 'generation-anchor',
      points: [
        [10, 20],
        [410, 420],
      ],
      angle: 0,
      anchorType: 'ratio',
      phase: 'failed',
      title: '图片生成',
      subtitle: '图片生成失败',
      error: 'API Key 无效或已过期',
      transitionMode: 'hold',
      createdAt: Date.now(),
      workflowId: 'workflow-1',
      taskIds: ['task-1'],
      primaryTaskId: 'task-1',
      zoom: 1,
    } as PlaitImageGenerationAnchor;

    generator.processDrawing(element, parentG, true);

    const fallback = parentG.querySelector(
      '.image-generation-anchor-desktop-fallback'
    );
    expect(parentG.querySelector('foreignObject')).toBeNull();
    expect(fallback?.textContent).toContain('生成失败');
    expect(fallback?.textContent).toContain('API Key 无效或已过期');
    expect(fallback?.textContent).toContain('重试');
    expect(fallback?.textContent).toContain('关闭');

    const retryListener = vi.fn();
    window.addEventListener(IMAGE_GENERATION_ANCHOR_RETRY_EVENT, retryListener);
    const retryButton = fallback?.querySelector<SVGGElement>(
      '[aria-label="重试"]'
    );
    const pointerDownEvent = new Event('pointerdown', {
      bubbles: true,
      cancelable: true,
    });
    retryButton?.dispatchEvent(pointerDownEvent);
    expect(pointerDownEvent.defaultPrevented).toBe(false);
    retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(retryListener).toHaveBeenCalledOnce();
    expect(
      (retryListener.mock.calls[0][0] as CustomEvent).detail
    ).toMatchObject({ taskId: 'task-1', anchorId: 'anchor-desktop' });
    retryButton?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(retryListener).toHaveBeenCalledTimes(2);
    window.removeEventListener(
      IMAGE_GENERATION_ANCHOR_RETRY_EVENT,
      retryListener
    );

    fallback
      ?.querySelector<SVGGElement>('[aria-label="关闭"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(deleteFragment).toHaveBeenCalledWith([element]);

    generator.destroy();
  });
});
