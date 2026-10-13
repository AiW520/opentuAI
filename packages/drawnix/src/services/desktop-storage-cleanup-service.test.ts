import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginDesktopCleanup,
  beginDesktopMediaWrite,
} from './desktop-cleanup-lock';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  removeCache: vi.fn(),
  risk: vi.fn(() => ({
    activeTaskCount: 0,
    activeWorkflowCount: 0,
    hasPendingSync: false,
  })),
  sync: vi.fn(() => 'synced'),
  boards: vi.fn(() => []),
  tasks: vi.fn(() => []),
}));
vi.mock('./local-data-clear-service', () => ({
  getLocalDataClearRisk: mocks.risk,
}));
vi.mock('./github-sync/sync-engine', () => ({
  syncEngine: { getSyncStatus: mocks.sync },
}));
vi.mock('./workspace-service', () => ({
  workspaceService: { getAllBoards: mocks.boards },
}));
vi.mock('./task-queue-service', () => ({
  taskQueueService: { getAllTasks: mocks.tasks },
}));
vi.mock('./unified-cache-service', () => ({
  unifiedCacheService: {
    pauseDesktopCleanupWrites: mocks.pause,
    resumeCacheWrites: mocks.resume,
    removeDeletedDesktopCacheIndex: mocks.removeCache,
  },
}));

import {
  MediaReferenceIndex,
  getCachedDesktopStorage,
  inspectDesktopStorage,
  deleteDesktopMedia,
  clearDesktopPreviewCache,
} from './desktop-storage-cleanup-service';

const file = {
  path: '/media/images/content-a.png',
  name: 'content-a.png',
  size: 1234,
  modified: '123',
  kind: 'image',
};
const asset = {
  id: 'asset-uuid',
  filePath: file.path,
  url: 'opentu-asset://localhost/%2Fmedia%2Fimages%2Fcontent-a.png',
  type: 'IMAGE',
  name: 'My image',
};

async function put(
  database: string,
  store: string,
  key: string,
  value: unknown
) {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(database);
    request.onupgradeneeded = () => request.result.createObjectStore(store);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

async function readAsset() {
  return new Promise((resolve) => {
    const req = indexedDB.open('aitu-assets');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('assets');
      tx.objectStore('assets').get('asset-uuid').onsuccess = (event) =>
        resolve((event.target as IDBRequest).result);
      tx.oncomplete = () => db.close();
    };
  });
}

describe('desktop storage cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('IDBKeyRange', IDBKeyRange);
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: { invoke: mocks.invoke },
    });
    localStorage.clear();
    mocks.risk.mockReturnValue({
      activeTaskCount: 0,
      activeWorkflowCount: 0,
      hasPendingSync: false,
    });
    mocks.sync.mockReturnValue('synced');
    mocks.boards.mockReturnValue([]);
    mocks.tasks.mockReturnValue([]);
    mocks.pause.mockResolvedValue(undefined);
    mocks.invoke.mockImplementation(async (command) =>
      command === 'inspect_media_storage'
        ? { root: '/media', files: [file], errors: [], nativeReferences: [] }
        : [{ path: file.path, deletedBytes: file.size, error: null }]
    );
  });

  it('retains references beyond the first cursor batch', async () => {
    await put('aitu-assets', 'assets', asset.id, asset);
    await put('aitu-workspace', 'boards', '000', {});
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('aitu-workspace');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('boards', 'readwrite');
        for (let i = 1; i <= 420; i++)
          tx.objectStore('boards').put(
            i === 420 ? { name: 'last board', url: asset.url } : {},
            String(i).padStart(3, '0')
          );
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
    const progress = vi.fn();
    const inventory = await inspectDesktopStorage(undefined, { onProgress: progress });
    expect(inventory.errors).toEqual([]);
    expect(inventory.files[0].references.join(' ')).toContain('last board');
    expect(progress.mock.calls.some(([value]) => value.completed === 200)).toBe(true);
  });

  it('skips an enumerated database only when opening proves it has no persisted version', async () => {
    await put('aitu-assets', 'assets', asset.id, asset);
    await put('aitu-workspace', 'boards', 'b1', { url: asset.url });
    const databases = indexedDB.databases.bind(indexedDB);
    vi.spyOn(indexedDB, 'databases').mockImplementation(async () => [
      ...await databases(), { name: 'sw-task-queue', version: 0 },
    ]);
    const inventory = await inspectDesktopStorage();
    expect(inventory.errors).toEqual([]);
    expect(inventory.files[0].references.length).toBeGreaterThan(0);
    expect((await databases()).some((db) => db.name === 'sw-task-queue')).toBe(false);
  });

  it('protects shared board references through asset IDs and encoded paths', () => {
    const index = new MediaReferenceIndex([file]);
    index.owner('aitu-assets', 'assets', asset.id, asset);
    expect(index.files[0].owned).toBe(true);
    index.reference(
      { nested: [{ url: '/asset-library/asset-uuid.png' }] },
      'Board A'
    );
    index.reference(JSON.stringify({ url: asset.url }), 'Board B');
    expect(index.files[0].references).toEqual(['Board A', 'Board B']);
  });

  it('reads persisted project records and preserves unindexed files', async () => {
    await put('aitu-assets', 'assets', asset.id, asset);
    await put('aitu-workspace', 'boards', 'b1', {
      name: '共享画板',
      elements: [{ url: asset.url }],
    });
    const result = await inspectDesktopStorage();
    expect(result.errors).toEqual([]);
    expect(result.files[0].references).toContain('画板：共享画板');
    const cached = getCachedDesktopStorage();
    expect(cached?.stale).toBe(true);
    expect(cached?.files[0].references).toContain('画板：共享画板');
    const unknown = new MediaReferenceIndex([file]);
    expect(unknown.files[0].owned).toBe(false);
  });

  it('protects duplicate names in current and legacy directories', () => {
    const legacy = { ...file, path: '/media/图片/content-a.png' };
    const index = new MediaReferenceIndex([file, legacy]);
    index.owner('aitu-assets', 'assets', asset.id, asset);
    index.reference({ url: asset.url }, 'Shared board');
    expect(
      index.files.every((entry) => entry.references.includes('Shared board'))
    ).toBe(true);
  });

  it('fails closed when database enumeration is unavailable', async () => {
    Object.defineProperty(indexedDB, 'databases', { value: undefined });
    const result = await inspectDesktopStorage();
    expect(result.errors[0]).toContain('停用永久删除');
    await expect(
      deleteDesktopMedia(result, result.files, () => [])
    ).rejects.toThrow('检查不完整');
    expect(mocks.invoke).not.toHaveBeenCalledWith(
      'delete_inspected_media',
      expect.anything()
    );
    expect(mocks.resume).toHaveBeenCalled();
  });

  it('revalidates live board references before deleting', async () => {
    await put('aitu-assets', 'assets', asset.id, asset);
    const result = await inspectDesktopStorage();
    await expect(
      deleteDesktopMedia(result, result.files, () => [{ url: asset.url }])
    ).rejects.toThrow('正在使用');
    expect(await readAsset()).toBeTruthy();
    expect(mocks.resume).toHaveBeenCalled();
  });

  it('removes owner records only after disk deletion succeeds', async () => {
    await put('aitu-assets', 'assets', asset.id, asset);
    const result = await inspectDesktopStorage();
    const deleted = await deleteDesktopMedia(result, result.files, () => []);
    expect(deleted).toEqual({ count: 1, bytes: file.size, failures: [] });
    expect(await readAsset()).toBeUndefined();
  });

  it('retains indexes and reports disk deletion failures', async () => {
    await put('aitu-assets', 'assets', asset.id, asset);
    const result = await inspectDesktopStorage();
    mocks.invoke
      .mockResolvedValueOnce({
        root: '/media',
        files: [file],
        errors: [],
        nativeReferences: [],
      })
      .mockResolvedValueOnce([
        { path: file.path, deletedBytes: 0, error: 'permission denied' },
      ]);
    const deleted = await deleteDesktopMedia(result, result.files, () => []);
    expect(deleted.count).toBe(0);
    expect(deleted.failures[0]).toContain('permission denied');
    expect(await readAsset()).toBeTruthy();
  });

  it('refuses concurrent imports and active generation', async () => {
    const release = beginDesktopMediaWrite();
    expect(() => beginDesktopCleanup()).toThrow('正在导入');
    release();
    const finish = beginDesktopCleanup();
    expect(() => beginDesktopMediaWrite()).toThrow('正在清理');
    finish();
    mocks.risk.mockReturnValue({
      activeTaskCount: 1,
      activeWorkflowCount: 0,
      hasPendingSync: false,
    });
    await expect(clearDesktopPreviewCache()).rejects.toThrow('生成任务');
  });

  it('clears derived previews while retaining source records and settings', async () => {
    await put('aitu-assets', 'assets', asset.id, asset);
    const cacheDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: cacheDelete });
    localStorage.setItem('drawnix_settings', 'keep');
    localStorage.setItem('ai_image_generation_preview_cache', 'preview');
    await clearDesktopPreviewCache();
    expect(cacheDelete).toHaveBeenCalledWith('drawnix-images-thumb');
    expect(mocks.pause).toHaveBeenCalled();
    expect(mocks.resume).toHaveBeenCalled();
    expect(
      localStorage.getItem('ai_image_generation_preview_cache')
    ).toBeNull();
    expect(localStorage.getItem('drawnix_settings')).toBe('keep');
    expect(await readAsset()).toBeTruthy();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
