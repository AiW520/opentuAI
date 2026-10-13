import { afterEach, describe, expect, it, vi } from 'vitest';
import { unifiedCacheService } from './unified-cache-service';

afterEach(() => vi.restoreAllMocks());

describe('desktop file save scheduling', () => {
  it('bounds parallel writes, serializes colliding filenames and drains the latest update', async () => {
    const service = unifiedCacheService as any;
    const started: Array<{ url: string; blob: Blob; finish: () => void }> = [];
    vi.spyOn(service, 'saveToTauriFileSystem').mockImplementation(
      (url: unknown, blob: unknown) => new Promise<void>((resolve) => {
        started.push({ url: String(url), blob: blob as Blob, finish: resolve });
      })
    );
    const first = new Blob(['first']);
    const latest = new Blob(['latest']);
    service.enqueueDesktopFileSave('/a/shared.png', first, 'image', '1');
    service.enqueueDesktopFileSave('/b/shared.png', first, 'image', '2');
    service.enqueueDesktopFileSave('/a/shared.png', first, 'image', '3');
    service.enqueueDesktopFileSave('/a/shared.png', latest, 'image', '4');
    service.enqueueDesktopFileSave('/other.png', first, 'image', '5');
    service.enqueueDesktopFileSave('/third.png', first, 'image', '6');
    let drained = false;
    const drain = service.waitForDesktopFileSaves().then(() => { drained = true; });
    await vi.waitFor(() => expect(started).toHaveLength(2));
    expect(started.map((item) => item.url)).toEqual(['/a/shared.png', '/other.png']);
    expect(drained).toBe(false);
    started[0].finish();
    await vi.waitFor(() => expect(started).toHaveLength(3));
    expect(started[2].url).toBe('/b/shared.png');
    started[1].finish();
    await vi.waitFor(() => expect(started).toHaveLength(4));
    expect(started[3].url).toBe('/third.png');
    started[2].finish();
    await vi.waitFor(() => expect(started).toHaveLength(5));
    expect(started[4].blob).toBe(latest);
    started[3].finish();
    started[4].finish();
    await drain;
    expect(service.desktopFileSaveActive).toBe(0);
    expect(service.desktopFileSaveActivePaths.size).toBe(0);
  });

  it('continues pending writes after a failure', async () => {
    const service = unifiedCacheService as any;
    const save = vi.spyOn(service, 'saveToTauriFileSystem')
      .mockRejectedValueOnce(new Error('fixture write failed'))
      .mockResolvedValue(undefined);
    service.enqueueDesktopFileSave('/failure.png', new Blob(['a']), 'image', '1');
    service.enqueueDesktopFileSave('/failure.png', new Blob(['b']), 'image', '2');
    await service.waitForDesktopFileSaves();
    expect(save).toHaveBeenCalledTimes(2);
    expect(service.desktopFileSaveActivePaths.size).toBe(0);
  });
});
