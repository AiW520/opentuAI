// @vitest-environment jsdom

import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PlaitBoard } from '@plait/core';
import type { PlaitImageGenerationAnchor } from '../../types/image-generation-anchor.types';
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
    });

    const foreignObject = parentG.querySelector('foreignObject');
    const host = foreignObject?.querySelector('.image-generation-anchor-host');

    expect(foreignObject).not.toBeNull();
    expect(host).toBeInstanceOf(HTMLDivElement);
    expect(host?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    expect(host?.getAttribute('xmlns')).toBe('http://www.w3.org/1999/xhtml');
    expect(host?.querySelector('.image-generation-anchor')?.textContent).toBe(
      '生成中'
    );

    await act(async () => {
      generator.destroy();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    svg.remove();
  });
});
