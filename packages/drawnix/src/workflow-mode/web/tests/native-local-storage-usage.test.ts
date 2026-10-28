import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLocalStorageUsage } from '../src/services/local-storage-usage';

function emptyDatabase() {
    vi.stubGlobal('indexedDB', {
        open: () => {
            const request: { result: object; onsuccess?: () => void } = {
                result: { objectStoreNames: [], version: 1, close: vi.fn() },
            };
            queueMicrotask(() => request.onsuccess?.());
            return request;
        },
    });
}

afterEach(() => vi.unstubAllGlobals());

describe('local storage estimate', () => {
    it.each([
        ['missing', undefined],
        ['rejected', vi.fn().mockRejectedValue(new Error('unavailable'))],
    ])('falls back to database usage when estimate is %s', async (_label, estimate) => {
        emptyDatabase();
        vi.stubGlobal('navigator', { storage: estimate ? { estimate } : undefined });
        expect(await readLocalStorageUsage()).toMatchObject({ usage: 0, quota: null, contentBytes: 0 });
    });

    it('uses available storage estimates', async () => {
        emptyDatabase();
        vi.stubGlobal('navigator', { storage: { estimate: vi.fn().mockResolvedValue({ usage: 42, quota: 100 }) } });
        expect(await readLocalStorageUsage()).toMatchObject({ usage: 42, quota: 100 });
    });
});
