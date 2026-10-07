// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mountNativeImageOverlay } from './native-image-overlay';

function fixture() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const foreignObject = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'foreignObject'
  );
  for (const [attribute, value] of Object.entries({
    x: '20',
    y: '30',
    width: '400',
    height: '300',
  }))
    foreignObject.setAttribute(attribute, value);
  svg.append(foreignObject);
  return { svg, foreignObject };
}

describe('native canvas image overlay', () => {
  it('paints the resolved image in SVG and follows moves and resizes', async () => {
    const { svg, foreignObject } = fixture();
    const cleanup = mountNativeImageOverlay(foreignObject, 'blob:local-image');
    const image = svg.querySelector('image')!;
    expect(image.getAttribute('href')).toBe('blob:local-image');
    expect(image.getAttribute('x')).toBe('20');
    expect(image.getAttribute('width')).toBe('400');
    foreignObject.setAttribute('x', '80');
    foreignObject.setAttribute('width', '600');
    await Promise.resolve();
    expect(image.getAttribute('x')).toBe('80');
    expect(image.getAttribute('width')).toBe('600');
    expect(foreignObject.style.visibility).toBe('hidden');
    cleanup();
    expect(svg.querySelector('image')).toBeNull();
    expect(foreignObject.style.visibility).toBe('');
  });

  it('preserves frame fitting, layer visibility, opacity and prior styles', () => {
    const { svg, foreignObject } = fixture();
    foreignObject.style.visibility = 'collapse';
    const cleanup = mountNativeImageOverlay(foreignObject, 'blob:frame', {
      contain: true,
      hidden: true,
      opacity: 0.4,
    });
    const image = svg.querySelector('image')!;
    expect(image.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(image.getAttribute('visibility')).toBe('hidden');
    expect(image.getAttribute('opacity')).toBe('0.4');
    expect(image.getAttribute('pointer-events')).toBe('none');
    cleanup();
    expect(foreignObject.style.visibility).toBe('collapse');
  });
});
