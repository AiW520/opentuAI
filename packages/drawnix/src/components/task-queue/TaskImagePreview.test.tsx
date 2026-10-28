// @vitest-environment jsdom
import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  TaskImagePreview,
  TASK_IMAGE_PREVIEW_TIMEOUT_MS,
} from './TaskImagePreview';
import { unifiedCacheService } from '../../services/unified-cache-service';

vi.mock('../../services/unified-cache-service', () => ({
  unifiedCacheService: { getCachedImageBlobWithThumbnailFallback: vi.fn() },
}));
vi.mock('@aitu/utils', () => ({
  normalizeImageDataUrl: (value: string) => value,
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(unifiedCacheService.getCachedImageBlobWithThumbnailFallback)
    .mockReset()
    .mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('retries a stalled preview without opening the task', async () => {
  const source = 'https://cdn.example.com/generated.png?signature=unchanged';
  const openDetails = vi.fn();
  render(
    <div onClick={openDetails}>
      <TaskImagePreview src={source} isCached={false} />
    </div>
  );
  await act(() => vi.advanceTimersByTimeAsync(TASK_IMAGE_PREVIEW_TIMEOUT_MS));
  fireEvent.click(screen.getByRole('button', { name: '重新加载预览' }));
  await act(async () => undefined);
  expect(openDetails).not.toHaveBeenCalled();
  const image = screen.getByAltText('Generated');
  expect(image.getAttribute('src')).toBe(source);
  fireEvent.load(image);
  expect(image.style.opacity).toBe('1');
});

it('recovers when the result becomes cached after preview failure', async () => {
  const source = 'https://cdn.example.com/cache-later.png';
  const { rerender } = render(
    <TaskImagePreview src={source} isCached={false} />
  );
  await act(() => vi.advanceTimersByTimeAsync(TASK_IMAGE_PREVIEW_TIMEOUT_MS));
  vi.mocked(
    unifiedCacheService.getCachedImageBlobWithThumbnailFallback
  ).mockResolvedValue(new Blob(['image']));
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: () => 'blob:available',
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  rerender(<TaskImagePreview src={source} isCached />);
  await act(async () => undefined);
  const image = screen.getByAltText('Generated');
  expect(image.getAttribute('src')).toBe('blob:available');
  fireEvent.load(image);
  expect(image.style.opacity).toBe('1');
});
