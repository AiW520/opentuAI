import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './map-with-concurrency';

describe('mapWithConcurrency', () => {
  it('limits active work and preserves input order', async () => {
    let active = 0;
    let maxActive = 0;
    const values = [30, 5, 20, 1, 10];

    const result = await mapWithConcurrency(values, 3, async (delay, index) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, delay));
      active -= 1;
      return `item-${index}`;
    });

    expect(maxActive).toBe(3);
    expect(result).toEqual(['item-0', 'item-1', 'item-2', 'item-3', 'item-4']);
  });

  it('returns an empty result without starting workers', async () => {
    expect(await mapWithConcurrency([], 3, async () => 'unused')).toEqual([]);
  });
});
